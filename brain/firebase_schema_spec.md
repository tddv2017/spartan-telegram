/**
 * SPARTAN QUANT AI - FIREBASE FIRESTORE DATABASE SCHEMA
 * Location: /home/quoc/documents/projects/telegram-trading-bot-miniapp/brain/firebase_schema_spec.md
 */

// 1. COLLECTION: "users" (Document ID: telegram_id)
{
  "telegram_id": 98240291,             // number / string (Primary Key)
  "username": "alex_trader",           // string
  "first_name": "Alex",                // string
  "role": "CLIENT",                    // "CLIENT" | "RESELLER" | "ADMIN"
  "trading_balance": 907.00,           // number (Net Trading Equity)
  "referral_balance": 0.00,            // number (Earned referral commission)
  "referral_code": "SPARTAN_98240291", // string
  "referrer_id": "1788035393",         // string (Reseller ID)
  "reseller_tier": 1,                  // number (Level 1 to Level 10)
  "created_at": "2026-08-30T10:00:00Z" // timestamp
}

// 2. COLLECTION: "transactions" (Document ID: auto-generated UUID)
{
  "id": "tx_98240291_001",             // string
  "user_id": "98240291",               // string (References users collection)
  "type": "DEPOSIT",                   // "DEPOSIT" | "WITHDRAW"
  "gross_amount": 1000.00,             // number
  "fee_amount": 93.00,                 // number (9% + $3)
  "net_amount": 907.00,                // number
  "status": "APPROVED",                // "PENDING" | "APPROVED" | "REJECTED"
  "memo_code": "SPARTAN_98240291",     // string
  "approved_by": "tddv2017",           // string
  "approved_at": "2026-08-30T10:05:00Z",
  "created_at": "2026-08-30T10:00:00Z"
}

// 3. COLLECTION: "trading_pools" (Document ID: "master_exness_pool")
{
  "master_account": 9824029,           // number
  "master_total_equity": 50000.00,     // number (Gross MT5 Equity)
  "trading_equity_pool": 45350.00,     // number (Net Client Pool 90.7%)
  "admin_fee_reserve": 4650.00,        // number (Admin Fee Treasury 9.3%)
  "updated_at": "2026-08-30T12:00:00Z"
}

// 4. COLLECTION: "master_deals" (Document ID: deal_ticket)
{
  "deal_ticket": 89201948,             // number
  "symbol": "XAUUSD",                  // string
  "deal_type": "BUY",                  // "BUY" | "SELL" | "BALANCE"
  "volume": 0.50,                      // number (Lot size)
  "profit": 100.00,                    // number ($100 USD profit)
  "closed_at": "2026-08-30T12:00:00Z"
}

// 5. COLLECTION: "commissions" (Document ID: auto-generated)
{
  "reseller_id": "1788035393",         // string
  "source_user_id": "98240291",        // string
  "type": "PERFORMANCE_FEE_SHARE",     // "DEPOSIT_FEE_SHARE" | "PERFORMANCE_FEE_SHARE"
  "amount": 4.00,                      // number ($4 USD commission)
  "created_at": "2026-08-30T12:00:00Z"
}
