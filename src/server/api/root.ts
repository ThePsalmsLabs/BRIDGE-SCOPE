import { createTRPCRouter } from './trpc';
import { dappRouter } from './routers/dapp';
import { transferRouter } from './routers/transfer';
import { statsRouter } from './routers/stats';

export const appRouter = createTRPCRouter({
  dapp: dappRouter,
  transfer: transferRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;