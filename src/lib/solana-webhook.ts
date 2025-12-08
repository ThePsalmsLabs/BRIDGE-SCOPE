import crypto from 'crypto';
import PQueue from 'p-queue';

import { BRIDGE_CONTRACTS, RELAYER_ADDRESSES } from './constants';
import { db } from '@/server/db/client';

type HeliusWebhook = {
  id: string;
  webhookURL: string;
  accountAddresses: string[];
  transactions: HeliusTransaction[];
};

type HeliusTransaction = {
  signature: string;
  slot: number;
  timestamp: number;
  accountData: { account: string; nativeBalanceChange: number }[];
  instructions: Array<{ programId: string; accounts: string[]; data?: string; innerInstructions?: unknown[] }>;
  events?: {
    tokenTransfers?: Array<{
      mint: string;
      fromUserAccount: string;
      toUserAccount: string;
      tokenAmount: number | string;
      decimals?: number;
    }>;
    transfers?: Array<{
      mint?: string;
      fromUserAccount?: string;
      toUserAccount?: string;
      tokenAmount?: number | string;
      decimals?: number;
    }>;
  };
  // other fields omitted for brevity
};

export type NormalizedTransfer = {
  signature: string;
  slot: number;
  blockTime: Date;
  programId: string;
  sourceWallet: string | null;
  destination: string | null;
  mint: string | null;
  amount: string | null;
  relayer: string | null;
  direction: 'SOLANA_TO_BASE';
  attributionDapp: string | null;
  attributionConfidence: number;
  attributionSignals: string[];
};

const queue = new PQueue({ concurrency: 4 });

export function verifyHeliusSignature(headers: Headers, rawBody: string): boolean {
  const provided = headers.get('x-helius-signature');
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (!secret || !provided) return false;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  // constant-time compare
  const a = Buffer.from(provided);
  const b = Buffer.from(hmac);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function enqueueHeliusPayload(body: HeliusWebhook) {
  void queue.add(() => handleHeliusPayload(body));
}

async function handleHeliusPayload(body: HeliusWebhook) {
  for (const tx of body.transactions || []) {
    const normalized = normalizeTransaction(tx);
    if (!normalized) continue;

    try {
      await upsertTransfer(normalized);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[solana-webhook] upsert error', err);
    }
  }
}

function normalizeTransaction(tx: HeliusTransaction): NormalizedTransfer | null {
  const bridgeProgram = BRIDGE_CONTRACTS.SOLANA.BRIDGE_PROGRAM;
  const relayerProgram = BRIDGE_CONTRACTS.SOLANA.RELAYER_PROGRAM;
  const hit = tx.instructions.find(
    (ix) => ix.programId === bridgeProgram || ix.programId === relayerProgram
  );
  if (!hit) return null;

  const relayer =
    tx.instructions
      .map((ix) => (ix.programId === relayerProgram ? ix.accounts[0] : null))
      .find(Boolean) ?? null;

  const relayerDapp = relayer ? relayerToDapp(relayer) : null;

  const attributionSignals: string[] = [];
  let attributionDapp: string | null = null;
  let attributionConfidence = 0;

  if (relayerDapp) {
    attributionDapp = relayerDapp;
    attributionConfidence = 85;
    attributionSignals.push(`RELAYER:${relayer}`);
  }

  const parsedToken = parseTokenTransfer(tx);

  const sourceWallet =
    parsedToken?.from ??
    tx.accountData.find((a) => a.nativeBalanceChange < 0)?.account ??
    null;
  const destination =
    parsedToken?.to ?? tx.accountData.find((a) => a.nativeBalanceChange > 0)?.account ?? null;

  return {
    signature: tx.signature,
    slot: tx.slot,
    blockTime: new Date(tx.timestamp * 1000),
    programId: hit.programId,
    sourceWallet,
    destination,
    mint: parsedToken?.mint ?? null,
    amount: parsedToken?.amount ?? null,
    relayer,
    direction: 'SOLANA_TO_BASE',
    attributionDapp,
    attributionConfidence,
    attributionSignals,
  };
}

function parseTokenTransfer(tx: HeliusTransaction) {
  const tokenXfer =
    tx.events?.tokenTransfers?.[0] ??
    tx.events?.transfers?.[0];
  if (!tokenXfer) return null;
  const decimals = typeof tokenXfer.decimals === 'number' ? tokenXfer.decimals : 9;
  const amountRaw = tokenXfer.tokenAmount ?? tokenXfer.tokenAmount === 0 ? tokenXfer.tokenAmount : null;
  const amount =
    amountRaw !== null && amountRaw !== undefined
      ? typeof amountRaw === 'number'
        ? amountRaw.toString()
        : String(amountRaw)
      : null;

  return {
    mint: tokenXfer.mint ?? null,
    from: tokenXfer.fromUserAccount ?? null,
    to: tokenXfer.toUserAccount ?? null,
    amount: amount,
    decimals,
  };
}

function relayerToDapp(address: string): string | null {
  const relayers = RELAYER_ADDRESSES.SOLANA;
  const normalized = address;
  if (normalized === relayers.ZORA) return 'zora';
  if (normalized === relayers.AERODROME) return 'aerodrome';
  return null;
}

async function upsertTransfer(tx: NormalizedTransfer) {
  await db.query(
    `
    create table if not exists transfers_solana (
      signature text not null,
      slot bigint not null,
      block_time timestamptz not null,
      program_id text not null,
      source_wallet text,
      destination text,
      mint text,
      amount text,
      relayer text,
      direction text not null,
      attribution_dapp text,
      attribution_confidence int,
      attribution_signals text[],
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      constraint transfers_solana_pk primary key (signature, program_id)
    );
    `
  );

  await db.query(
    `
    insert into transfers_solana (
      signature, slot, block_time, program_id, source_wallet, destination, mint, amount,
      relayer, direction, attribution_dapp, attribution_confidence, attribution_signals
    )
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    on conflict (signature, program_id)
    do update set
      slot = excluded.slot,
      block_time = excluded.block_time,
      source_wallet = excluded.source_wallet,
      destination = excluded.destination,
      mint = excluded.mint,
      amount = excluded.amount,
      relayer = excluded.relayer,
      attribution_dapp = excluded.attribution_dapp,
      attribution_confidence = excluded.attribution_confidence,
      attribution_signals = excluded.attribution_signals,
      updated_at = now();
    `,
    [
      tx.signature,
      tx.slot,
      tx.blockTime,
      tx.programId,
      tx.sourceWallet,
      tx.destination,
      tx.mint,
      tx.amount,
      tx.relayer,
      tx.direction,
      tx.attributionDapp,
      tx.attributionConfidence,
      tx.attributionSignals,
    ]
  );
}

