-- CreateEnum
CREATE TYPE "Chain" AS ENUM ('BASE', 'SOLANA');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('BASE_TO_SOLANA', 'SOLANA_TO_BASE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DappCategory" AS ENUM ('NFT_MARKETPLACE', 'DEX', 'AI_AGENTS', 'LAUNCHPAD', 'BRIDGE_AGGREGATOR', 'LENDING', 'SOCIAL', 'DEFI', 'GAMING', 'OTHER');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('CHAINLINK', 'COINGECKO', 'PYTH', 'MANUAL', 'ESTIMATED');

-- CreateEnum
CREATE TYPE "StatsPeriod" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "decimals" INTEGER NOT NULL DEFAULT 18,
    "logoUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_prices" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "priceUsd" DECIMAL(20,8) NOT NULL,
    "source" "PriceSource" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "volume24h" DECIMAL(20,2),
    "marketCap" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "direction" "Direction" NOT NULL,
    "chain" "Chain" NOT NULL,
    "status" "TransferStatus" NOT NULL,
    "from" TEXT,
    "to" TEXT NOT NULL,
    "localToken" TEXT NOT NULL,
    "remoteToken" TEXT,
    "amount" TEXT NOT NULL,
    "amountNormalized" DECIMAL(30,6) NOT NULL,
    "amountUsd" DECIMAL(20,2),
    "priceUsdAtTime" DECIMAL(20,8),
    "dappId" TEXT,
    "attributionConfidence" INTEGER,
    "attributionMethod" TEXT,
    "messageHash" TEXT,
    "relayer" TEXT,
    "feeAmount" TEXT,
    "feeAmountUsd" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dapps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DappCategory" NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dapps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dapp_contracts" (
    "id" TEXT NOT NULL,
    "dappId" TEXT NOT NULL,
    "chain" "Chain" NOT NULL,
    "address" TEXT NOT NULL,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dapp_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dapp_stats" (
    "id" TEXT NOT NULL,
    "dappId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "period" "StatsPeriod" NOT NULL,
    "volumeUsd" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "volumeToken" DECIMAL(30,6) NOT NULL DEFAULT 0,
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "feesPaidUsd" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "baseToSolanaVolume" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "baseToSolanaCount" INTEGER NOT NULL DEFAULT 0,
    "solanaToBaseVolume" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "solanaToBaseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dapp_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "period" "StatsPeriod" NOT NULL,
    "volumeUsd" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "activeDapps" INTEGER NOT NULL DEFAULT 0,
    "feesPaidUsd" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "baseToSolanaVolume" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "baseToSolanaCount" INTEGER NOT NULL DEFAULT 0,
    "solanaToBaseVolume" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "solanaToBaseCount" INTEGER NOT NULL DEFAULT 0,
    "baseBlockHeight" BIGINT,
    "solanaSlot" BIGINT,
    "indexingLagSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_address_key" ON "tokens"("address");

-- CreateIndex
CREATE INDEX "tokens_chain_idx" ON "tokens"("chain");

-- CreateIndex
CREATE INDEX "tokens_symbol_idx" ON "tokens"("symbol");

-- CreateIndex
CREATE INDEX "token_prices_tokenId_timestamp_idx" ON "token_prices"("tokenId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "token_prices_timestamp_idx" ON "token_prices"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "token_prices_tokenId_timestamp_key" ON "token_prices"("tokenId", "timestamp");

-- CreateIndex
CREATE INDEX "transfers_blockTimestamp_idx" ON "transfers"("blockTimestamp" DESC);

-- CreateIndex
CREATE INDEX "transfers_chain_blockTimestamp_idx" ON "transfers"("chain", "blockTimestamp");

-- CreateIndex
CREATE INDEX "transfers_direction_blockTimestamp_idx" ON "transfers"("direction", "blockTimestamp");

-- CreateIndex
CREATE INDEX "transfers_to_blockTimestamp_idx" ON "transfers"("to", "blockTimestamp");

-- CreateIndex
CREATE INDEX "transfers_dappId_blockTimestamp_idx" ON "transfers"("dappId", "blockTimestamp");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_transactionHash_logIndex_key" ON "transfers"("transactionHash", "logIndex");

-- CreateIndex
CREATE INDEX "dapp_contracts_dappId_idx" ON "dapp_contracts"("dappId");

-- CreateIndex
CREATE UNIQUE INDEX "dapp_contracts_chain_address_key" ON "dapp_contracts"("chain", "address");

-- CreateIndex
CREATE INDEX "dapp_stats_date_period_idx" ON "dapp_stats"("date", "period");

-- CreateIndex
CREATE UNIQUE INDEX "dapp_stats_dappId_date_period_key" ON "dapp_stats"("dappId", "date", "period");

-- CreateIndex
CREATE INDEX "global_stats_date_period_idx" ON "global_stats"("date", "period");

-- CreateIndex
CREATE UNIQUE INDEX "global_stats_date_period_key" ON "global_stats"("date", "period");

-- AddForeignKey
ALTER TABLE "token_prices" ADD CONSTRAINT "token_prices_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_localToken_fkey" FOREIGN KEY ("localToken") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_dappId_fkey" FOREIGN KEY ("dappId") REFERENCES "dapps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dapp_contracts" ADD CONSTRAINT "dapp_contracts_dappId_fkey" FOREIGN KEY ("dappId") REFERENCES "dapps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dapp_stats" ADD CONSTRAINT "dapp_stats_dappId_fkey" FOREIGN KEY ("dappId") REFERENCES "dapps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
