/**
 * Production Subgraph Sync Service
 *
 * Syncs transfer data from The Graph subgraph to PostgreSQL database
 * with proper USD pricing and attribution
 */

import { db } from '@/lib/db';
import { fetchSubgraph } from '@/lib/subgraph';
import { getHistoricalTokenPrice, calculateUsdValue } from '@/lib/priceOracle';
import { attributeTransfer } from '@/lib/attribution';
import { SUBGRAPH_URLS } from '@/lib/constants';
import { resolveTokenMetadata } from '@/lib/onchainMetadata';

const BATCH_SIZE = 100;
const SYNC_INTERVAL_MS = 30_000; // 30 seconds

type SubgraphTransfer = {
  id: string;
  localToken: string;
  remoteToken: string;
  to: string;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
};

type SubgraphTransferInitialized = SubgraphTransfer;
type SubgraphTransferFinalized = SubgraphTransfer;

/**
 * Sync transfers from subgraph to database
 */
async function syncTransfers(chain: 'BASE' | 'SOLANA') {
  const subgraphUrl = chain === 'BASE' ? SUBGRAPH_URLS.BASE : SUBGRAPH_URLS.SOLANA;

  if (!subgraphUrl) {
    throw new Error(`Subgraph URL not configured for ${chain}`);
  }

  console.log(`\n🔄 Syncing ${chain} transfers...`);

  // Get the latest synced block for this chain
  const latestTransfer = await db.transfer.findFirst({
    where: { chain },
    orderBy: { blockNumber: 'desc' },
  });

  const fromBlock = latestTransfer ? Number(latestTransfer.blockNumber) + 1 : 0;

  console.log(`  📍 Starting from block ${fromBlock}`);

  // Fetch initialized transfers (outgoing)
  const initializedQuery = `
    query SyncInitialized($fromBlock: BigInt!, $first: Int!) {
      transferInitializeds(
        first: $first
        orderBy: blockNumber
        orderDirection: asc
        where: { blockNumber_gte: $fromBlock }
      ) {
        id
        localToken
        remoteToken
        to
        amount
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  // Fetch finalized transfers (incoming)
  const finalizedQuery = `
    query SyncFinalized($fromBlock: BigInt!, $first: Int!) {
      transferFinalizeds(
        first: $first
        orderBy: blockNumber
        orderDirection: asc
        where: { blockNumber_gte: $fromBlock }
      ) {
        id
        localToken
        remoteToken
        to
        amount
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  // Fetch both types
  const [initializedData, finalizedData] = await Promise.all([
    fetchSubgraph<{ transferInitializeds: SubgraphTransferInitialized[] }>(
      subgraphUrl,
      initializedQuery,
      { fromBlock: fromBlock.toString(), first: BATCH_SIZE }
    ),
    fetchSubgraph<{ transferFinalizeds: SubgraphTransferFinalized[] }>(
      subgraphUrl,
      finalizedQuery,
      { fromBlock: fromBlock.toString(), first: BATCH_SIZE }
    ),
  ]);

  const initialized = initializedData.transferInitializeds || [];
  const finalized = finalizedData.transferFinalizeds || [];

  console.log(`  📥 Found ${initialized.length} initialized, ${finalized.length} finalized`);

  // Process initialized transfers
  for (const transfer of initialized) {
    await processTransfer(transfer, chain, 'INITIALIZED');
  }

  // Process finalized transfers
  for (const transfer of finalized) {
    await processTransfer(transfer, chain, 'FINALIZED');
  }

  const totalProcessed = initialized.length + finalized.length;
  console.log(`  ✅ Processed ${totalProcessed} transfers for ${chain}`);

  return totalProcessed;
}

/**
 * Process a single transfer and store in database
 */
async function processTransfer(
  transfer: SubgraphTransfer,
  chain: 'BASE' | 'SOLANA',
  kind: 'INITIALIZED' | 'FINALIZED'
) {
  const transferId = `${transfer.transactionHash}-${transfer.id}`;

  // Check if already exists
  const existing = await db.transfer.findUnique({ where: { id: transferId } });
  if (existing) {
    return; // Skip duplicates
  }

  // Determine direction and status
  const direction = kind === 'INITIALIZED'
    ? chain === 'BASE' ? 'BASE_TO_SOLANA' : 'SOLANA_TO_BASE'
    : chain === 'BASE' ? 'SOLANA_TO_BASE' : 'BASE_TO_SOLANA';

  const status = kind === 'FINALIZED' ? 'COMPLETED' : 'PENDING';

  // Get or create token metadata
  const tokenAddress = transfer.localToken.toLowerCase();
  let token = await db.token.findUnique({ where: { id: tokenAddress } });

  if (!token) {
    // Fetch metadata from chain
    const metadata = await resolveTokenMetadata(transfer.localToken);
    if (metadata) {
      token = await db.token.create({
        data: {
          id: tokenAddress,
          address: tokenAddress,
          chain,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          isVerified: false,
        },
      });
      console.log(`    🪙 New token discovered: ${metadata.symbol} (${tokenAddress})`);
    } else {
      // Create with defaults
      token = await db.token.create({
        data: {
          id: tokenAddress,
          address: tokenAddress,
          chain,
          symbol: 'UNKNOWN',
          decimals: 18,
          isVerified: false,
        },
      });
      console.warn(`    ⚠️  Could not resolve token metadata: ${tokenAddress}`);
    }
  }

  // Calculate normalized amount
  const amountNormalized = Number(transfer.amount) / Math.pow(10, token.decimals);

  // Get USD price at time of transfer
  const transferTimestamp = new Date(Number(transfer.blockTimestamp) * 1000);
  const usdValue = await calculateUsdValue(
    tokenAddress,
    transfer.amount,
    token.decimals,
    transferTimestamp
  );

  // Get price for storage
  const priceData = await getHistoricalTokenPrice(tokenAddress, transferTimestamp);

  // Attribution
  const attribution = attributeTransfer({ targetContract: transfer.to });

  // Extract log index from ID (format: txHash-logIndex)
  const logIndex = parseInt(transfer.id.split('-').pop() || '0');

  // Create transfer record
  await db.transfer.create({
    data: {
      id: transferId,
      transactionHash: transfer.transactionHash,
      blockNumber: BigInt(transfer.blockNumber),
      blockTimestamp: transferTimestamp,
      logIndex,
      direction,
      chain,
      status,
      to: transfer.to.toLowerCase(),
      localToken: tokenAddress,
      remoteToken: transfer.remoteToken,
      amount: transfer.amount,
      amountNormalized,
      amountUsd: usdValue,
      priceUsdAtTime: priceData?.priceUsd,
      dappId: attribution.dappId,
      attributionConfidence: attribution.confidence,
      attributionMethod: attribution.signals[0]?.type || 'UNKNOWN',
    },
  });

  if (usdValue) {
    console.log(
      `    ✓ ${token.symbol} ${amountNormalized.toFixed(2)} ($${usdValue.toFixed(2)}) → ${attribution.dappId || 'Unknown'}`
    );
  } else {
    console.log(
      `    ✓ ${token.symbol} ${amountNormalized.toFixed(2)} (price unavailable) → ${attribution.dappId || 'Unknown'}`
    );
  }
}

/**
 * Aggregate daily stats
 */
async function aggregateDailyStats() {
  console.log('\n📊 Aggregating daily stats...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Global stats
  const globalAgg = await db.transfer.aggregate({
    where: {
      blockTimestamp: {
        gte: today,
      },
      amountUsd: { not: null },
    },
    _sum: { amountUsd: true },
    _count: { id: true },
  });

  const uniqueUsers = await db.transfer.findMany({
    where: {
      blockTimestamp: { gte: today },
      from: { not: null },
    },
    select: { from: true },
    distinct: ['from'],
  });

  const activeDapps = await db.transfer.findMany({
    where: {
      blockTimestamp: { gte: today },
      dappId: { not: null },
    },
    select: { dappId: true },
    distinct: ['dappId'],
  });

  // Directional breakdown
  const baseToSolana = await db.transfer.aggregate({
    where: {
      blockTimestamp: { gte: today },
      direction: 'BASE_TO_SOLANA',
      amountUsd: { not: null },
    },
    _sum: { amountUsd: true },
    _count: { id: true },
  });

  const solanaToBase = await db.transfer.aggregate({
    where: {
      blockTimestamp: { gte: today },
      direction: 'SOLANA_TO_BASE',
      amountUsd: { not: null },
    },
    _sum: { amountUsd: true },
    _count: { id: true },
  });

  // Upsert global stats
  await db.globalStats.upsert({
    where: {
      date_period: {
        date: today,
        period: 'DAILY',
      },
    },
    update: {
      volumeUsd: globalAgg._sum.amountUsd || 0,
      transferCount: globalAgg._count.id,
      uniqueUsers: uniqueUsers.length,
      activeDapps: activeDapps.length,
      baseToSolanaVolume: baseToSolana._sum.amountUsd || 0,
      baseToSolanaCount: baseToSolana._count.id,
      solanaToBaseVolume: solanaToBase._sum.amountUsd || 0,
      solanaToBaseCount: solanaToBase._count.id,
    },
    create: {
      date: today,
      period: 'DAILY',
      volumeUsd: globalAgg._sum.amountUsd || 0,
      transferCount: globalAgg._count.id,
      uniqueUsers: uniqueUsers.length,
      activeDapps: activeDapps.length,
      baseToSolanaVolume: baseToSolana._sum.amountUsd || 0,
      baseToSolanaCount: baseToSolana._count.id,
      solanaToBaseVolume: solanaToBase._sum.amountUsd || 0,
      solanaToBaseCount: solanaToBase._count.id,
    },
  });

  console.log(`  ✅ Global stats: $${(Number(globalAgg._sum.amountUsd) || 0).toFixed(2)} volume, ${globalAgg._count.id} transfers`);

  // Per-dApp stats
  const dapps = await db.dapp.findMany();

  for (const dapp of dapps) {
    const dappAgg = await db.transfer.aggregate({
      where: {
        blockTimestamp: { gte: today },
        dappId: dapp.id,
        amountUsd: { not: null },
      },
      _sum: { amountUsd: true, amountNormalized: true },
      _count: { id: true },
    });

    const dappUsers = await db.transfer.findMany({
      where: {
        blockTimestamp: { gte: today },
        dappId: dapp.id,
        from: { not: null },
      },
      select: { from: true },
      distinct: ['from'],
    });

    if (dappAgg._count.id > 0) {
      await db.dappStats.upsert({
        where: {
          dappId_date_period: {
            dappId: dapp.id,
            date: today,
            period: 'DAILY',
          },
        },
        update: {
          volumeUsd: dappAgg._sum.amountUsd || 0,
          volumeToken: dappAgg._sum.amountNormalized || 0,
          transferCount: dappAgg._count.id,
          uniqueUsers: dappUsers.length,
        },
        create: {
          dappId: dapp.id,
          date: today,
          period: 'DAILY',
          volumeUsd: dappAgg._sum.amountUsd || 0,
          volumeToken: dappAgg._sum.amountNormalized || 0,
          transferCount: dappAgg._count.id,
          uniqueUsers: dappUsers.length,
        },
      });
    }
  }

  console.log(`  ✅ Aggregated stats for ${dapps.length} dApps`);
}

/**
 * Main sync loop
 */
async function main() {
  console.log('🚀 Starting BaseBridgeScope Sync Service\n');

  // Verify database connection
  try {
    await db.$queryRaw`SELECT 1`;
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Verify subgraph URLs
  if (!SUBGRAPH_URLS.BASE) {
    console.error('❌ NEXT_PUBLIC_SUBGRAPH_URL_BASE is not configured');
    process.exit(1);
  }

  console.log(`📡 Base Subgraph: ${SUBGRAPH_URLS.BASE}`);
  if (SUBGRAPH_URLS.SOLANA) {
    console.log(`📡 Solana Subgraph: ${SUBGRAPH_URLS.SOLANA}`);
  } else {
    console.warn('⚠️  Solana subgraph not configured (will skip Solana sync)');
  }

  // Initial sync
  try {
    await syncTransfers('BASE');
    if (SUBGRAPH_URLS.SOLANA) {
      await syncTransfers('SOLANA');
    }
    await aggregateDailyStats();
  } catch (error) {
    console.error('❌ Initial sync failed:', error);
    throw error;
  }

  // Continuous sync loop
  console.log(`\n⏰ Starting continuous sync (every ${SYNC_INTERVAL_MS / 1000}s)...\n`);

  setInterval(async () => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`\n[${timestamp}] Running scheduled sync...`);

      await syncTransfers('BASE');
      if (SUBGRAPH_URLS.SOLANA) {
        await syncTransfers('SOLANA');
      }
      await aggregateDailyStats();

      console.log(`[${timestamp}] ✅ Sync completed\n`);
    } catch (error) {
      console.error('❌ Sync error:', error);
      // Continue running despite errors
    }
  }, SYNC_INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    await db.$disconnect();
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { syncTransfers, aggregateDailyStats };
