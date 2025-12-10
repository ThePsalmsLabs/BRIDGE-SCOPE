export type DappCategory =
  | 'NFT_MARKETPLACE'
  | 'DEX'
  | 'AI_AGENTS'
  | 'LAUNCHPAD'
  | 'BRIDGE_AGGREGATOR'
  | 'LENDING'
  | 'SOCIAL'
  | 'DEFI'
  | 'OTHER';

export type DappContract = {
  chain: 'BASE' | 'SOLANA';
  address: string;
  role?:
    | 'router'
    | 'factory'
    | 'twin'
    | 'relayer'
    | 'protocol'
    | 'token'
    | 'universal_router'
    | 'comptroller'
    | 'fair_launch'
    | 'position_manager'
    | 'shares'
    | 'morpho_blue';
};

export type Dapp = {
  id: string;
  name: string;
  category: DappCategory;
  volumeUsd?: number;
  transfers?: number;
  contracts?: DappContract[];
};

