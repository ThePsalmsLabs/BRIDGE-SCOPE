import type { Dapp } from '@/types/dapp';

export const SUBGRAPH_URLS = {
  BASE: process.env.NEXT_PUBLIC_SUBGRAPH_URL_BASE || '',
  SOLANA: process.env.NEXT_PUBLIC_SUBGRAPH_URL_SOLANA || '',
} as const;

export const BRIDGE_CONTRACTS = {
  BASE: {
    BRIDGE: '0x3eff766C76a1be2Ce1aCF2B69c78bCae257D5188',
    VALIDATOR: '0xAF24c1c24Ff3BF1e6D882518120fC25442d6794B',
    FACTORY: '0xDD56781d0509650f8C2981231B6C917f2DD56781d',
    SOL_ERC20: '0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82',
  },
  SOLANA: {
    BRIDGE_PROGRAM: 'HNCne2FkVaNghhjKXapxJzPaBvAKDG1Ge3gqhZyfVWLM',
    RELAYER_PROGRAM: 'g1et5VenhfJHJwsdJsDbxWZuotD5H4iELNG61kS4fb9',
  },
} as const;

export const RELAYER_ADDRESSES = {
  SOLANA: {
    ZORA: 'AFs1LCbodhvwpgX3u3URLsud6R1XMSaMiQ5LtXw4GKYT',
    AERODROME: 'B7g2YCbodhvwpgX3u3URLsud6R1XMSaMiQ5LtXw4GKBC',
  },
} as const;

export const DAPP_REGISTRY: Dapp[] = [
  {
    id: 'aerodrome',
    name: 'Aerodrome',
    category: 'DEX',
    contracts: [
      { chain: 'BASE', address: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da', role: 'router' },
      { chain: 'BASE', address: '0x827922686190790b37229fd06084350E74485b72', role: 'factory' },
      { chain: 'BASE', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', role: 'token' },
    ],
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    category: 'DEX',
    contracts: [
      { chain: 'BASE', address: '0x198EF79F1F515F02dFE9e3115eD9fC07183f02fC', role: 'universal_router' },
      { chain: 'BASE', address: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', role: 'factory' },
    ],
  },
  {
    id: 'moonwell',
    name: 'Moonwell',
    category: 'LENDING',
    contracts: [
      { chain: 'BASE', address: '0xfBb21d0380beE3312B33c4353c8936a0F13EF26C', role: 'comptroller' },
      { chain: 'BASE', address: '0xA88594D404727625A9437C3f886C7643872296AE', role: 'token' },
    ],
  },
  {
    id: 'zora',
    name: 'Zora',
    category: 'NFT_MARKETPLACE',
    contracts: [
      { chain: 'BASE', address: '0x777777C338d93e2C7adf08D102d45CA7CC4Ed021', role: 'protocol' },
    ],
  },
  {
    id: 'virtuals',
    name: 'Virtuals Protocol',
    category: 'AI_AGENTS',
    contracts: [
      { chain: 'BASE', address: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b', role: 'token' },
    ],
  },
  {
    id: 'flaunch',
    name: 'Flaunch',
    category: 'LAUNCHPAD',
    contracts: [
      { chain: 'BASE', address: '0x4dc442403e8c758425b93c59dc737da522f32640', role: 'fair_launch' },
      { chain: 'BASE', address: '0x23321f11a6d44fd1ab790044fdfde5758c902fdc', role: 'position_manager' },
    ],
  },
  {
    id: 'friendtech',
    name: 'Friend.tech',
    category: 'SOCIAL',
    contracts: [
      { chain: 'BASE', address: '0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4', role: 'shares' },
      { chain: 'BASE', address: '0x0bd4887f7d41b35cd75dff9ffee2856106f86670', role: 'token' },
    ],
  },
  {
    id: 'morpho',
    name: 'Morpho',
    category: 'LENDING',
    contracts: [
      { chain: 'BASE', address: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb', role: 'morpho_blue' },
    ],
  },
];