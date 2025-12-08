import { Pool } from 'pg';
import type { QueryResultRow } from 'pg';

/**
 * Minimal Postgres client for server-side use (webhooks, API reads).
 * Uses DATABASE_URL; safe to share across handlers.
 */
const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
    })
  : null;

export const db = {
  /**
   * Run a simple query; returns rows or throws.
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    if (!pool) throw new Error('DATABASE_URL is not set');
    const res = await pool.query<T>(text, params as any);
    return res.rows as T[];
  },

  /**
   * Health check helper.
   */
  async ping() {
    if (!pool) return 'missing DATABASE_URL';
    await pool.query('select 1');
    return 'ok';
  },
};

export type DbClient = typeof db;

