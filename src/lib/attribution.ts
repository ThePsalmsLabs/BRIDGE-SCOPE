import { RELAYER_ADDRESSES } from './constants';
import { getDappByContract } from './registry';
import type { AttributionResult } from '@/types/bridge';

type AttributionInputs = {
  targetContract?: string | null;
  relayer?: string | null;
  twinContract?: string | null;
  precedingTxTo?: string | null;
  walletLabel?: string | null;
};

export function attributeTransfer({
  targetContract,
  relayer,
  twinContract,
  precedingTxTo,
  walletLabel,
}: AttributionInputs): AttributionResult {
  const signals: AttributionResult['signals'] = [];

  if (targetContract) {
    const dapp = getDappByContract(targetContract);
    if (dapp) {
      return {
        dappId: dapp.id,
        confidence: 95,
        signals: [
          {
            type: 'TARGET_CONTRACT',
            value: targetContract,
            confidence: 95,
          },
        ],
      };
    }
  }

  if (relayer) {
    const relayerLower = relayer.toLowerCase();
    const match = Object.entries(RELAYER_ADDRESSES.SOLANA).find(
      ([, addr]) => addr.toLowerCase() === relayerLower
    );
    if (match) {
      signals.push({
        type: 'RELAYER',
        value: match[0].toLowerCase(),
        confidence: 85,
      });
      return { dappId: match[0].toLowerCase(), confidence: 85, signals };
    }
  }

  if (precedingTxTo) {
    const dapp = getDappByContract(precedingTxTo);
    if (dapp) {
      signals.push({
        type: 'PRECEDING_TX',
        value: dapp.id,
        confidence: 65,
      });
      return { dappId: dapp.id, confidence: 65, signals };
    }
  }

  if (walletLabel?.includes('zora')) {
    signals.push({
      type: 'WALLET_LABEL',
      value: 'zora',
      confidence: 50,
    });
    return { dappId: 'zora', confidence: 50, signals };
  }

  return { dappId: null, confidence: 0, signals: signals.length ? signals : [{ type: 'UNKNOWN', value: 'none', confidence: 0 }] };
}

