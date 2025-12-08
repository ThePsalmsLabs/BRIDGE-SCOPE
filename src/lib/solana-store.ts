import { db } from '@/server/db/client';

type TransferRow = {
  signature: string;
  block_time: Date;
  source_wallet: string | null;
  destination: string | null;
  mint: string | null;
  amount: string | null;
  relayer: string | null;
  direction: string;
  attribution_dapp: string | null;
  attribution_confidence: number | null;
};

export async function fetchRecentTransfers(limit = 20): Promise<TransferRow[]> {
  try {
    const rows = await db.query<TransferRow>(
      `
        select
          signature,
          block_time,
          source_wallet,
          destination,
          mint,
          amount,
          relayer,
          direction,
          attribution_dapp,
          attribution_confidence
        from transfers_solana
        where block_time > now() - interval '30 days'
        order by block_time desc
        limit $1
      `,
      [limit]
    );
    return rows;
  } catch (err) {
    // table may not exist yet; fallback to empty
    return [];
  }
}

export async function fetchDappLeaderboard(limit = 10) {
  try {
    const rows = await db.query<{
      attribution_dapp: string;
      transfers: number;
    }>(
      `
      select attribution_dapp, count(*) as transfers
      from transfers_solana
      where attribution_dapp is not null
      group by attribution_dapp
      order by transfers desc
      limit $1
      `,
      [limit]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function fetchGlobalStats() {
  try {
    const rows = await db.query<{ transfers: number; latest: Date }>(
      `
      select count(*)::int as transfers, max(block_time) as latest
      from transfers_solana
      `
    );
    return rows[0] ?? { transfers: 0, latest: null };
  } catch {
    return { transfers: 0, latest: null };
  }
}

