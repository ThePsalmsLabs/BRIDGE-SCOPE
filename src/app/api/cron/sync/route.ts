/**
 * Vercel Cron Job API Route
 * Syncs subgraph data to database daily (Vercel Hobby plan compatible)
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchSubgraph } from '@/lib/subgraph';
import { resolveTokenMetadata } from '@/lib/onchainMetadata';
import { getTokenPrice, calculateUsdValue } from '@/lib/priceOracle';
import { attributeTransfer } from '@/lib/attribution';

export const maxDuration = 60; // Maximum execution time for Vercel Hobby (60s)
export const dynamic = 'force-dynamic';

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL_BASE;

interface SubgraphTransfer {
  id: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  sender: string;
  recipient: string;
  token: string;
  amount: string;
  direction: 'BASE_TO_SOLANA' | 'SOLANA_TO_BASE';
}

async function fetchSubgraphTransfers(params: {
  since: number;
  limit: number;
}): Promise<SubgraphTransfer[]> {
  if (!SUBGRAPH_URL) {
    console.warn('⚠️  No subgraph URL configured');
    return [];
  }

  const query = `
    query GetRecentTransfers($since: Int!, $limit: Int!) {
      transferFinalizeds(
        first: $limit
        orderBy: timestamp
        orderDirection: desc
        where: { timestamp_gte: $since }
      ) {
        id
        transactionHash
        blockNumber
        timestamp
        recipient
        localToken
        amount
      }
    }
  `;

  const result = await fetchSubgraph<{ transferFinalizeds: any[] }>(
    SUBGRAPH_URL,
    query,
    params
  );

  return result.transferFinalizeds.map((t) => ({
    id: t.id,
    transactionHash: t.transactionHash,
    blockNumber: t.blockNumber,
    timestamp: t.timestamp,
    sender: '', // Not available in current schema
    recipient: t.recipient,
    token: t.localToken,
    amount: t.amount,
    direction: 'BASE_TO_SOLANA' as const,
  }));
}

export async function GET(request: Request) {
  // Verify this is a cron request (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Starting cron sync...');

    // Get last synced timestamp
    const lastTransfer = await db.transfer.findFirst({
      orderBy: { blockTimestamp: 'desc' },
      select: { blockTimestamp: true },
    });

    const since = lastTransfer?.blockTimestamp ?? new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24h

    // Fetch new transfers from subgraph
    const transfers = await fetchSubgraphTransfers({
      since: Math.floor(since.getTime() / 1000),
      limit: 1000, // Process larger batches for daily sync
    });

    console.log(`📦 Found ${transfers.length} new transfers`);

    let synced = 0;
    let errors = 0;

    // Process each transfer
    for (const transfer of transfers) {
      try {
        // Resolve token metadata
        const tokenMetadata = await resolveTokenMetadata(transfer.token);

        if (!tokenMetadata) {
          console.warn(`No metadata for token ${transfer.token}, skipping`);
          continue;
        }

        // Get price (current price, not historical)
        const price = await getTokenPrice(transfer.token);

        // Calculate USD value
        const amountUsd = price
          ? await calculateUsdValue(
              transfer.token,
              transfer.amount,
              tokenMetadata.decimals
            )
          : null;

        // Attribute to dApp
        const attribution = attributeTransfer({
          targetContract: transfer.recipient,
        });

        // Create unique ID (transactionHash + logIndex)
        const transferId = `${transfer.transactionHash}-0`;

        // Calculate normalized amount
        const amountNormalized =
          Number(transfer.amount) / Math.pow(10, tokenMetadata.decimals);

        // Store in database
        await db.transfer.upsert({
          where: { id: transferId },
          create: {
            id: transferId,
            transactionHash: transfer.transactionHash,
            blockNumber: BigInt(transfer.blockNumber),
            blockTimestamp: new Date(parseInt(transfer.timestamp) * 1000),
            logIndex: 0, // Default, not available from subgraph
            direction: 'BASE_TO_SOLANA',
            chain: 'BASE',
            status: 'COMPLETED',
            from: transfer.sender || null,
            to: transfer.recipient,
            localToken: transfer.token.toLowerCase(),
            remoteToken: null,
            amount: transfer.amount,
            amountNormalized,
            amountUsd: amountUsd ? parseFloat(amountUsd.toFixed(2)) : null,
            priceUsdAtTime: price?.priceUsd ? parseFloat(price.priceUsd.toFixed(8)) : null,
            dappId: attribution.dappId ?? null,
            attributionConfidence: attribution.confidence,
            attributionMethod: attribution.dappId ? 'CONTRACT_MATCH' : null,
          },
          update: {
            amountUsd: amountUsd ? parseFloat(amountUsd.toFixed(2)) : null,
            priceUsdAtTime: price?.priceUsd ? parseFloat(price.priceUsd.toFixed(8)) : null,
            dappId: attribution.dappId ?? null,
            attributionConfidence: attribution.confidence,
          },
        });

        synced++;
      } catch (error) {
        console.error(`Error processing transfer ${transfer.transactionHash}:`, error);
        errors++;
      }
    }

    console.log(`✅ Synced ${synced} transfers, ${errors} errors`);

    return NextResponse.json({
      success: true,
      synced,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Cron sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
