// SPARTAN QUANT AI - PRISMA DATABASE SCHEMA (POSTGRESQL)
// Location: /home/quoc/documents/projects/telegram-trading-bot-miniapp/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 1. TABLE USER: Quản lý 100+ Khách hàng & Phân quyền Admin / Reseller
model User {
  id               String        @id @default(uuid())
  telegramId       BigInt        @unique @map("telegram_id")
  username         String?       @map("username")
  firstName        String?       @map("first_name")
  role             Role          @default(CLIENT)
  tradingBalance   Float         @default(0.0) @map("trading_balance")
  referralBalance  Float         @default(0.0) @map("referral_balance")
  referrerId       String?       @map("referrer_id")
  referralCode     String        @unique @map("referral_code")
  resellerTier     Int           @default(1) @map("reseller_tier")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  // Relationships
  transactions     Transaction[]
  referredUsers    User[]        @relation("UserReferrals")
  referrer         User?         @relation("UserReferrals", fields: [referrerId], references: [id])
  commissions      Commission[]

  @@map("users")
}

enum Role {
  CLIENT
  RESELLER
  ADMIN
}

// 2. TABLE TRANSACTION: Quản lý Lịch sử Nạp / Rút & Duyệt Tiền
model Transaction {
  id           String            @id @default(uuid())
  userId       String            @map("user_id")
  type         TransactionType
  grossAmount  Float             @map("gross_amount")
  feeAmount    Float             @map("fee_amount")
  netAmount    Float             @map("net_amount")
  status       TransactionStatus @default(PENDING)
  txHash       String?           @map("tx_hash")
  memoCode     String?           @map("memo_code")
  approvedBy   String?           @map("approved_by")
  approvedAt   DateTime?         @map("approved_at")
  createdAt    DateTime          @default(now()) @map("created_at")

  user         User              @relation(fields: [userId], references: [id])

  @@map("transactions")
}

enum TransactionType {
  DEPOSIT
  WITHDRAW
}

enum TransactionStatus {
  PENDING
  APPROVED
  REJECTED
}

// 3. TABLE TRADING_POOL: Quản lý Dual-Ledger Tài Khoản Master Exness
model TradingPool {
  id                String   @id @default(uuid())
  masterMt5Account  Long     @map("master_mt5_account")
  masterTotalEquity Float    @map("master_total_equity")
  tradingEquityPool Float    @map("trading_equity_pool")
  adminFeeReserve   Float    @map("admin_fee_reserve")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("trading_pools")
}

// 4. TABLE MASTER_DEAL: Lịch sử các lệnh trade Vàng XAUUSD từ MQL5 EA
model MasterDeal {
  id          String   @id @default(uuid())
  dealTicket  BigInt   @unique @map("deal_ticket")
  symbol      String   @default("XAUUSD")
  dealType    String   @map("deal_type") // BUY / SELL / BALANCE
  volume      Float    @map("volume")
  openPrice   Float?   @map("open_price")
  closePrice  Float?   @map("close_price")
  profit      Float    @map("profit")
  closedAt    DateTime @default(now()) @map("closed_at")

  @@map("master_deals")
}

// 5. TABLE COMMISSION: Quản lý Hoa hồng Đại Lý (Resellers)
model Commission {
  id           String   @id @default(uuid())
  resellerId   String   @map("reseller_id")
  sourceUserId String   @map("source_user_id")
  type         String   @map("type") // DEPOSIT_FEE_SHARE / PERFORMANCE_FEE_SHARE
  amount       Float    @map("amount")
  createdAt    DateTime @default(now()) @map("created_at")

  reseller     User     @relation(fields: [resellerId], references: [id])

  @@map("commissions")
}
