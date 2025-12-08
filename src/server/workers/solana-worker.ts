/**
 * Minimal worker to re-use the webhook parser for backfill/batch jobs.
 * Run with: `node -r ts-node/register src/server/workers/solana-worker.ts` (or tsx).
 * You can feed it Helius enhanced transaction batches and it will upsert via the same path.
 */
import fs from 'fs';

import { enqueueHeliusPayload } from '@/lib/solana-webhook';

async function main() {
  const file = process.argv[2];
  if (!file) {
    // eslint-disable-next-line no-console
    console.error('Usage: node solana-worker.ts <path-to-json-payload>');
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const payload = JSON.parse(raw);
  await enqueueHeliusPayload(payload);
  // eslint-disable-next-line no-console
  console.log('queued payload');
  // allow queue to drain before exit
  setTimeout(() => process.exit(0), 500);
}

void main();

