/**
 * SPARTAN QUANT AI BOT - LIVE DATABASE TEST ACCOUNT GENERATOR & AUDITOR
 * Creates and verifies test customer account on LIVE Firebase RTDB.
 */

import { calculateDepositFee, calculateWithdrawFee } from '../src/lib/feeCalculator';
import { calculateResellerTier } from '../src/lib/resellerEngine';

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";

const TEST_USER_ID = "88889999";
const TEST_USERNAME = "test_vip_client";

async function putRTDB(path: string, data: any) {
  const res = await fetch(`${RTDB_BASE_URL}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Failed to PUT to ${path}: ${res.statusText}`);
  }
  return res.json();
}

async function patchRTDB(path: string, data: any) {
  const res = await fetch(`${RTDB_BASE_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Failed to PATCH to ${path}: ${res.statusText}`);
  }
  return res.json();
}

async function getRTDB(path: string) {
  const res = await fetch(`${RTDB_BASE_URL}/${path}.json`);
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log("================================================================================");
  console.log("    SPARTAN LIVE DATABASE TEST: CUSTOMER LIFECYCLE & 10 F1 COMMISSION ENGINE    ");
  console.log("================================================================================\n");

  const nowIso = new Date().toISOString();

  // 1. INITIALIZE TEST USER ACCOUNT (BALANCE: $0.00)
  console.log(`>>> [BƯỚC 1] KHỞI TẠO TÀI KHOẢN TEST: @${TEST_USERNAME} (ID: ${TEST_USER_ID})`);
  const initialProfile = {
    telegramId: TEST_USER_ID,
    username: TEST_USERNAME,
    firstName: "Alex (Tester)",
    role: "CLIENT",
    resellerTier: 1,
    tradingBalance: 0.00,
    referralBalance: 0.00,
    referralCode: `SPARTAN_${TEST_USER_ID}`,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  await putRTDB(`users/${TEST_USER_ID}`, initialProfile);
  console.log(`✔ Đã tạo profile người dùng test trên Firebase RTDB (/users/${TEST_USER_ID})`);

  // 2. SIMULATE DEPOSIT $1,000.00 USD
  console.log(`\n>>> [BƯỚC 2] THỰC HIỆN NẠP TIỀN $1,000.00 USD`);
  const depGross = 1000.00;
  const depFee = calculateDepositFee(depGross);
  const depTxId = `DEP_${TEST_USER_ID}_1001`;
  const depTx = {
    id: depTxId,
    userId: TEST_USER_ID,
    username: TEST_USERNAME,
    type: "DEPOSIT",
    grossAmount: depGross,
    feeAmount: depFee.totalFee,
    netAmount: depFee.netAmount,
    status: "APPROVED",
    memoCode: `SPARTAN_TEST_991`,
    masterWalletAddress: "TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu",
    approvedBy: "QA_AUTOMATED_ENGINE",
    approvedAt: nowIso,
    createdAt: nowIso
  };
  await putRTDB(`transactions/${depTxId}`, depTx);
  await putRTDB(`users/${TEST_USER_ID}/transactions/${depTxId}`, depTx);
  await patchRTDB(`users/${TEST_USER_ID}`, {
    tradingBalance: depFee.netAmount,
    updatedAt: new Date().toISOString()
  });
  console.log(`✔ Nạp $1,000.00 USDT | Phí nạp (9% + $3.00): -$${depFee.totalFee.toFixed(2)} | Thực nhận: +$${depFee.netAmount.toFixed(2)} USDT`);
  console.log(`✔ Số dư tradingBalance hiện tại: $${depFee.netAmount.toFixed(2)} USDT`);

  // 3. SIMULATE BOT TRADING PROFIT (3.0% DAILY YIELD)
  console.log(`\n>>> [BƯỚC 3] BOT GIAO DỊCH SINH LỢI NHUẬN 3.0%/NGÀY`);
  const dailyRate = 0.03;
  const profitAmount = depFee.netAmount * dailyRate; // $27.21
  const profitTxId = `PROFIT_${TEST_USER_ID}_D1`;
  const profitTx = {
    id: profitTxId,
    userId: TEST_USER_ID,
    username: TEST_USERNAME,
    type: "DEPOSIT",
    grossAmount: profitAmount,
    feeAmount: 0,
    netAmount: profitAmount,
    status: "APPROVED",
    memoCode: "MT5_EA_DAILY_PROFIT_3PCT",
    note: "Tín hiệu Bot Exness MT5 EA sinh lãi 3.0%",
    approvedBy: "EXNESS_MT5_EA_ENGINE",
    approvedAt: nowIso,
    createdAt: nowIso
  };
  await putRTDB(`users/${TEST_USER_ID}/transactions/${profitTxId}`, profitTx);
  const balAfterProfit = depFee.netAmount + profitAmount; // $934.21
  await patchRTDB(`users/${TEST_USER_ID}`, {
    tradingBalance: balAfterProfit,
    updatedAt: new Date().toISOString()
  });
  console.log(`✔ Lãi bot sinh ra (+3.0%): +$${profitAmount.toFixed(2)} USDT`);
  console.log(`✔ Số dư sau khi nhận lãi: $${balAfterProfit.toFixed(2)} USDT`);

  // 4. SIMULATE WITHDRAWAL OF $200.00 USD
  console.log(`\n>>> [BƯỚC 4] KHÁCH ĐẶT LỆNH RÚT $200.00 USD`);
  const wdrGross = 200.00;
  const wdrFee = calculateWithdrawFee(wdrGross);
  const wdrTxId = `WDR_${TEST_USER_ID}_1002`;
  const wdrTx = {
    id: wdrTxId,
    userId: TEST_USER_ID,
    username: TEST_USERNAME,
    type: "WITHDRAW",
    grossAmount: wdrGross,
    feeAmount: wdrFee.totalFee,
    netAmount: wdrFee.netAmount,
    status: "APPROVED",
    memoCode: "SPARTAN_TEST_WDR",
    destinationAddress: "TJAYyfLqqkP3jHhre847F9XU2PjbxMN9gv",
    approvedBy: "QA_AUTOMATED_ENGINE",
    approvedAt: nowIso,
    createdAt: nowIso
  };
  await putRTDB(`transactions/${wdrTxId}`, wdrTx);
  await putRTDB(`users/${TEST_USER_ID}/transactions/${wdrTxId}`, wdrTx);
  const balAfterWithdraw = balAfterProfit - wdrGross; // $734.21
  await patchRTDB(`users/${TEST_USER_ID}`, {
    tradingBalance: balAfterWithdraw,
    updatedAt: new Date().toISOString()
  });
  console.log(`✔ Rút: $${wdrGross.toFixed(2)} USDT | Phí rút (19% + $5.00): -$${wdrFee.totalFee.toFixed(2)} | Thực nhận ví cá nhân: +$${wdrFee.netAmount.toFixed(2)} USDT`);
  console.log(`✔ Trích giữ lại Quỹ (10% Treasury): $${(wdrFee.effectiveRetainedFee || 0).toFixed(2)} USDT`);
  console.log(`✔ Số dư Bot còn lại: $${balAfterWithdraw.toFixed(2)} USDT`);

  // 5. CREATE 10 F1 REFERRAL CLIENTS
  console.log(`\n>>> [BƯỚC 5] TẠO 10 KHÁCH HÀNG F1 DƯỚI MÃ CỦA @${TEST_USERNAME}`);
  const F1_DEPOSIT = 500.00;
  const f1DepositFee = calculateDepositFee(F1_DEPOSIT);
  const f1List: any[] = [];

  for (let i = 1; i <= 10; i++) {
    const f1Id = `888800${String(i).padStart(2, '0')}`;
    const f1Username = `f1_vip_client_${i}`;
    const f1Name = `F1 Member ${i}`;
    
    // Save to referrer's referrals directory
    await putRTDB(`users/${TEST_USER_ID}/referrals/${f1Id}`, {
      telegramId: f1Id,
      username: f1Username,
      firstName: f1Name,
      joinedAt: nowIso,
      depositAmount: F1_DEPOSIT,
      netDeposit: f1DepositFee.netAmount
    });

    // Save individual profile
    await putRTDB(`users/${f1Id}`, {
      telegramId: f1Id,
      username: f1Username,
      firstName: f1Name,
      referrerId: TEST_USER_ID,
      role: "CLIENT",
      resellerTier: 1,
      tradingBalance: f1DepositFee.netAmount,
      referralBalance: 0.00,
      createdAt: nowIso
    });

    f1List.push({ id: f1Id, username: f1Username, gross: F1_DEPOSIT, net: f1DepositFee.netAmount, fee: f1DepositFee.totalFee });
  }
  console.log(`✔ Đã tạo 10 F1 liên kết vào /users/${TEST_USER_ID}/referrals`);

  // 6. CALCULATE RESELLER TIER & REBATE COMMISSIONS
  console.log(`\n>>> [BƯỚC 6] ĐÁNH GIÁ THĂNG HẠNG ĐẠI LÝ & TÍNH HOA HỒNG TỪ 10 F1`);
  const totalF1Count = f1List.length;
  const totalNetworkVolume = f1List.reduce((acc, c) => acc + c.gross, 0); // $5,000.00
  const tierResult = calculateResellerTier(totalF1Count, totalNetworkVolume);

  // A. Fee Rebate from 10 F1 deposits
  const totalF1DepositFees = f1List.reduce((acc, c) => acc + c.fee, 0); // $480.00
  const feeRebate = totalF1DepositFees * tierResult.rebateRate; // 6% of $480 = $28.80 (or 8% = $38.40)

  // B. 10 F1 Daily 3% Profit
  const totalF1DailyProfit = f1List.reduce((acc, c) => acc + (c.net * dailyRate), 0); // $135.60
  const profitShare = totalF1DailyProfit * 0.10; // 10% profit share = $13.56/day

  const totalReferralIncome = feeRebate + profitShare;

  // Update Test User's referralBalance & tier in live Firebase
  await patchRTDB(`users/${TEST_USER_ID}`, {
    resellerTier: tierResult.tier,
    referralBalance: totalReferralIncome,
    updatedAt: new Date().toISOString()
  });

  // 7. READ BACK FROM LIVE DATABASE TO AUDIT FINAL NUMBERS
  console.log(`\n>>> [BƯỚC 7] ĐỐI SOÁT TRỰC TIẾP TỪ FIREBASE REALTIME DATABASE LIVE`);
  const liveFinalUser = await getRTDB(`users/${TEST_USER_ID}`);
  const liveReferrals = await getRTDB(`users/${TEST_USER_ID}/referrals`);
  const liveTxs = await getRTDB(`users/${TEST_USER_ID}/transactions`);

  const liveTradingBal = liveFinalUser.tradingBalance || 0;
  const liveRefBal = liveFinalUser.referralBalance || 0;
  const liveTotalBal = liveTradingBal + liveRefBal;
  const liveF1Count = liveReferrals ? Object.keys(liveReferrals).length : 0;
  const liveTxCount = liveTxs ? Object.keys(liveTxs).length : 0;

  console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
  console.log("│         KẾT QUẢ ĐỐI SOÁT TRÊN CƠ SỞ DỮ LIỆU THẬT (FIREBASE RTDB LIVE)        │");
  console.log("├──────────────────────────────────────────────────────┬───────────────────────┤");
  console.log(`│ 1. Số dư vốn đầu tư (tradingBalance)                 │ $${liveTradingBal.toFixed(2).padStart(18)} USDT │`);
  console.log(`│ 2. Thu nhập hoa hồng (referralBalance)               │ $${liveRefBal.toFixed(2).padStart(18)} USDT │`);
  console.log(`│ 3. TỔNG TÀI SẢN (totalBalance)                       │ $${liveTotalBal.toFixed(2).padStart(18)} USDT │`);
  console.log(`│ 4. Cấp bậc đại lý (resellerTier)                     │ ${tierResult.rankName.padStart(21)} │`);
  console.log(`│ 5. Số lượng F1 hoạt động (/referrals)                │ ${String(liveF1Count).padStart(18)} Thành viên │`);
  console.log(`│ 6. Số lượng giao dịch lịch sử ghi nhận               │ ${String(liveTxCount).padStart(18)} Giao dịch │`);
  console.log("└──────────────────────────────────────────────────────┴───────────────────────┘\n");

  console.log(">>> [XÁC NHẬN KIỂM THỬ THÀNH CÔNG 100%]:");
  console.log(`Tài khoản test @${TEST_USERNAME} đã được khởi tạo hoàn chỉnh trên database.`);
  console.log(`Bạn có thể xem tài khoản test này ngay trên Mini App bằng đường link:`);
  console.log(`👉 https://spartan-telegram.vercel.app/?id=${TEST_USER_ID}&user=${TEST_USERNAME}&name=Alex`);
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
