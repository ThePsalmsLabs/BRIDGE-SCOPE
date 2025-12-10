import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// Known tokens on Base with their CoinGecko IDs (PRODUCTION ONLY)
const PRODUCTION_TOKENS = [
  {
    address: '0x4200000000000000000000000000000000000006',
    chain: 'BASE',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    isVerified: true,
    coingeckoId: 'weth',
  },
  {
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    chain: 'BASE',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isVerified: true,
    coingeckoId: 'usd-coin',
  },
  {
    address: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
    chain: 'BASE',
    symbol: 'USDbC',
    name: 'USD Base Coin',
    decimals: 6,
    isVerified: true,
    coingeckoId: 'bridged-usd-coin-base',
  },
  {
    address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
    chain: 'BASE',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    isVerified: true,
    coingeckoId: 'dai',
  },
  {
    address: '0x940181a94a35a4569e4529a3cdfb74e38fd98631',
    chain: 'BASE',
    symbol: 'AERO',
    name: 'Aerodrome Finance',
    decimals: 18,
    isVerified: true,
    coingeckoId: 'aerodrome-finance',
  },
  {
    address: '0xa88594d404727625a9437c3f886c7643872296ae',
    chain: 'BASE',
    symbol: 'WELL',
    name: 'Moonwell',
    decimals: 18,
    isVerified: true,
    coingeckoId: 'moonwell',
  },
  {
    address: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b',
    chain: 'BASE',
    symbol: 'VIRTUAL',
    name: 'Virtuals Protocol',
    decimals: 18,
    isVerified: true,
    coingeckoId: 'virtuals-protocol',
  },
] as const;

// dApp registry (PRODUCTION)
const PRODUCTION_DAPPS = [
  {
    id: 'aerodrome',
    name: 'Aerodrome',
    category: 'DEX',
    description: 'Next-generation AMM designed to serve as Base central liquidity hub',
    websiteUrl: 'https://aerodrome.finance',
    isVerified: true,
    contracts: [
      { chain: 'BASE', address: '0x420dd381b31aef6683db6b902084cb0ffece40da', role: 'router' },
      { chain: 'BASE', address: '0x827922686190790b37229fd06084350e74485b72', role: 'factory' },
      { chain: 'BASE', address: '0x940181a94a35a4569e4529a3cdfb74e38fd98631', role: 'token' },
    ],
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    category: 'DEX',
    description: 'Leading decentralized exchange protocol',
    websiteUrl: 'https://uniswap.org',
    isVerified: true,
    contracts: [
      { chain: 'BASE', address: '0x198ef79f1f515f02dfe9e3115ed9fc07183f02fc', role: 'universal_router' },
      { chain: 'BASE', address: '0x33128a8fc17869897dce68ed026d694621f6fdfd', role: 'factory' },
    ],
  },
  {
    id: 'moonwell',
    name: 'Moonwell',
    category: 'LENDING',
    description: 'Open lending and borrowing DeFi protocol',
    websiteUrl: 'https://moonwell.fi',
    isVerified: true,
    contracts: [
      { chain: 'BASE', address: '0xfbb21d0380bee3312b33c4353c8936a0f13ef26c', role: 'comptroller' },
      { chain: 'BASE', address: '0xa88594d404727625a9437c3f886c7643872296ae', role: 'token' },
    ],
  },
  {
    id: 'zora',
    name: 'Zora',
    category: 'NFT_MARKETPLACE',
    description: 'NFT marketplace and protocol for creators',
    websiteUrl: 'https://zora.co',
    isVerified: true,
    contracts: [{ chain: 'BASE', address: '0x777777c338d93e2c7adf08d102d45ca7cc4ed021', role: 'protocol' }],
  },
  {
    id: 'virtuals',
    name: 'Virtuals Protocol',
    category: 'AI_AGENTS',
    description: 'Co-own and earn from AI agents',
    websiteUrl: 'https://virtuals.io',
    isVerified: true,
    contracts: [{ chain: 'BASE', address: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b', role: 'token' }],
  },
  {
    id: 'flaunch',
    name: 'Flaunch',
    category: 'LAUNCHPAD',
    description: 'Fair launch platform for new tokens',
    websiteUrl: 'https://flaunch.io',
    isVerified: true,
    contracts: [
      { chain: 'BASE', address: '0x4dc442403e8c758425b93c59dc737da522f32640', role: 'fair_launch' },
      { chain: 'BASE', address: '0x23321f11a6d44fd1ab790044fdfde5758c902fdc', role: 'position_manager' },
    ],
  },
  {
    id: 'friendtech',
    name: 'Friend.tech',
    category: 'SOCIAL',
    description: 'Decentralized social trading platform',
    websiteUrl: 'https://friend.tech',
    isVerified: true,
    contracts: [
      { chain: 'BASE', address: '0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4', role: 'shares' },
      { chain: 'BASE', address: '0x0bd4887f7d41b35cd75dff9ffee2856106f86670', role: 'token' },
    ],
  },
  {
    id: 'morpho',
    name: 'Morpho',
    category: 'LENDING',
    description: 'Decentralized lending protocol optimization layer',
    websiteUrl: 'https://morpho.org',
    isVerified: true,
    contracts: [{ chain: 'BASE', address: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb', role: 'morpho_blue' }],
  },
] as const;

async function main() {
  console.log('🌱 Starting production database seed...');

  // 1. Seed Tokens
  console.log('\n📊 Seeding tokens...');
  for (const token of PRODUCTION_TOKENS) {
    const { coingeckoId, ...tokenData } = token;
    await prisma.token.upsert({
      where: { id: tokenData.address.toLowerCase() },
      update: tokenData,
      create: {
        ...tokenData,
        id: tokenData.address.toLowerCase(),
      },
    });
    console.log(`  ✓ ${token.symbol} (${token.address})`);
  }

  // 2. Seed dApps and their contracts
  console.log('\n🚀 Seeding dApps...');
  for (const dapp of PRODUCTION_DAPPS) {
    const { contracts, ...dappData } = dapp;

    // Create or update dApp
    await prisma.dapp.upsert({
      where: { id: dapp.id },
      update: dappData,
      create: dappData,
    });

    // Create contracts for this dApp
    for (const contract of contracts) {
      await prisma.dappContract.upsert({
        where: {
          chain_address: {
            chain: contract.chain,
            address: contract.address.toLowerCase(),
          },
        },
        update: {
          dappId: dapp.id,
          role: contract.role,
          isActive: true,
        },
        create: {
          dappId: dapp.id,
          chain: contract.chain,
          address: contract.address.toLowerCase(),
          role: contract.role,
          isActive: true,
        },
      });
    }

    console.log(`  ✓ ${dapp.name} (${contracts.length} contracts)`);
  }

  // 3. Create initial stats tables (empty, will be populated by sync service)
  console.log('\n📈 Initializing stats tables...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.globalStats.upsert({
      where: {
        date_period: {
          date: today,
          period: 'DAILY',
        },
      },
      update: {},
      create: {
        date: today,
        period: 'DAILY',
      },
    });
    console.log('  ✓ Global stats initialized');
  } catch (error) {
    console.log('  ℹ Global stats already exist');
  }

  console.log('\n✅ Production seed completed successfully!\n');
  console.log('Next steps:');
  console.log('  1. Configure NEXT_PUBLIC_SUBGRAPH_URL_BASE in .env');
  console.log('  2. Run the sync service to populate transfers');
  console.log('  3. Start the application\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
