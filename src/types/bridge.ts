export type BridgeDirection = {
  from: string;
  to: string;
};

export type BridgeTransfer = BridgeDirection & {
  id: string;
  amountUsd: number;
  status: "pending" | "completed" | "failed";
  txHash?: string;
};

export type AttributionSignalType =
  | "TARGET_CONTRACT"
  | "RELAYER"
  | "TWIN_CONTRACT"
  | "PRECEDING_TX"
  | "WALLET_LABEL"
  | "UNKNOWN";

export type AttributionSignal = {
  type: AttributionSignalType;
  value: string;
  confidence: number;
};

export type AttributionResult = {
  dappId: string | null;
  confidence: number;
  signals: AttributionSignal[];
};

