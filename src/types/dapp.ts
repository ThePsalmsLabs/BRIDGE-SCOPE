export type DappCategory =
  | 'NFT_MARKETPLACE'
  | 'DEX'
  | 'AI_AGENTS'
  | 'LAUNCHPAD'
  | 'BRIDGE_AGGREGATOR'
  | 'DEFI'
  | 'OTHER';

export type DappContract = {
  chain: 'BASE' | 'SOLANA';
  address: string;
  role?: 'router' | 'factory' | 'twin' | 'relayer' | 'protocol';
};

export type Dapp = {
  id: string;
  name: string;
  category: DappCategory;
  volumeUsd?: number;
  transfers?: number;
  contracts?: DappContract[];
};

