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
    id: 'zora',
    name: 'Zora',
    category: 'NFT_MARKETPLACE',
    contracts: [
      { chain: 'BASE', address: '0x777777C338d93e2C7adf08D102d45CA7CC4Ed021', role: 'protocol' },
    ],
  },
  {
    id: 'aerodrome',
    name: 'Aerodrome',
    category: 'DEX',
    contracts: [
      { chain: 'BASE', address: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da', role: 'router' },
      { chain: 'BASE', address: '0x827922686190790b37229fd06084350E74485b72', role: 'factory' },
    ],
  },
  {
    id: 'virtuals',
    name: 'Virtuals',
    category: 'AI_AGENTS',
    contracts: [{ chain: 'BASE', address: '0xVirtualsProtocol...', role: 'protocol' }],
  },
  {
    id: 'flaunch',
    name: 'Flaunch',
    category: 'LAUNCHPAD',
    contracts: [{ chain: 'BASE', address: '0xFlaunchProtocol...', role: 'protocol' }],
  },
  {
    id: 'relay',
    name: 'Relay',
    category: 'BRIDGE_AGGREGATOR',
    contracts: [{ chain: 'BASE', address: '0xRelayProtocol...', role: 'protocol' }],
  },
];