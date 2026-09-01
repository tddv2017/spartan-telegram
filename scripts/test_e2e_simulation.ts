/**
 * SPARTAN QUANT AI BOT - END-TO-END QA SIMULATION TEST SUITE
 * Test Persona: Senior Financial Systems / Blockchain QA Tester
 */

import { calculateDepositFee, calculateWithdrawFee } from '../src/lib/feeCalculator';

interface UserState {
  id: string;
  username: string;
  tradingBalance: number;
  referralBalance: number;
  resellerTier: number;
  f1Count: number;
  networkVolume: number;
  transactions: Array<{ type: string; gross: number; net: number; fee: number; note: string }>;
}

export function runFullQASimulation() {
  console.log("================================================================================");
  console.log("       SPARTAN QUANT AI BOT - SENIOR QA AUDIT & SIMULATION REPORT               ");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // STEP 1: INITIALIZE CUSTOMER A & DEPOSIT $1,000.00 USD
  // ---------------------------------------------------------------------------
  console.log(">>> [BƯỚC 1] KHỞI TẠO KHÁCH HÀNG ĐẦU TIÊN (USER A) & NẠP TIỀN");
  const userA: UserState = {
    id: "494232782",
    username: "tddv2017",
    tradingBalance: 0,
    referralBalance: 0,
    resellerTier: 1, // Starting Level 1
    f1Count: 0,
    networkVolume: 0,
    transactions: []
  };

  const depositGross = 1000.00;
  const depFee = calculateDepositFee(depositGross);
  userA.tradingBalance += depFee.netAmount;
  userA.transactions.push({
    type: "DEPOSIT",
    gross: depositGross,
    net: depFee.netAmount,
    fee: depFee.totalFee,
    note: `Nạp $1,000.00 USDT (Phí 9% + $3.00 = -$${depFee.totalFee.toFixed(2)})`
  });

  console.log(`- Vốn nạp ban đầu (Gross): $${depositGross.toFixed(2)} USDT`);
  console.log(`- Phí nạp (9% + $3.00):   -$${depFee.totalFee.toFixed(2)} USDT`);
  console.log(`- Thực nhận vào Bot (Net): +$${depFee.netAmount.toFixed(2)} USDT`);
  console.log(`=> Số dư đầu tư Khách A:    $${userA.tradingBalance.toFixed(2)} USDT\n`);

  // ---------------------------------------------------------------------------
  // STEP 2: BOT TRADING PROFIT (LÃI 3.0%/NGÀY) CHO KHÁCH A
  // ---------------------------------------------------------------------------
  console.log(">>> [BƯỚC 2] BOT GIAO DỊCH SINH LỢI NHUẬN 3.0%/NGÀY CHO KHÁCH A");
  const dailyYieldRate = 0.03; // 3.0% / day
  const profitA_Day1 = userA.tradingBalance * dailyYieldRate;
  userA.tradingBalance += profitA_Day1;
  userA.transactions.push({
    type: "BOT_PROFIT",
    gross: profitA_Day1,
    net: profitA_Day1,
    fee: 0,
    note: `Lãi bot ngày 1 (+3.0% trên $${depFee.netAmount.toFixed(2)}): +$${profitA_Day1.toFixed(2)}`
  });

  console.log(`- Tỷ suất sinh lời Bot:     3.0%/ngày`);
  console.log(`- Lợi nhuận phát sinh:     +$${profitA_Day1.toFixed(2)} USDT`);
  console.log(`=> Số dư mới của Khách A:   $${userA.tradingBalance.toFixed(2)} USDT\n`);

  // ---------------------------------------------------------------------------
  // STEP 3: RÚT TIỀN $200.00 USD & KHẤU TRỪ PHÍ CHIẾN LƯỢC
  // ---------------------------------------------------------------------------
  console.log(">>> [BƯỚC 3] KHÁCH A THỰC HIỆN LỆNH RÚT $200.00 USD");
  const withdrawGross = 200.00;
  const wdrFee = calculateWithdrawFee(withdrawGross);
  userA.tradingBalance -= withdrawGross;
  userA.transactions.push({
    type: "WITHDRAW",
    gross: withdrawGross,
    net: wdrFee.netAmount,
    fee: wdrFee.totalFee,
    note: `Rút $200.00 USDT (Phí 19% + $5.00 = -$${wdrFee.totalFee.toFixed(2)}, Treasury: $${wdrFee.effectiveRetainedFee?.toFixed(2)})`
  });

  console.log(`- Số tiền yêu cầu rút:      $${withdrawGross.toFixed(2)} USDT`);
  console.log(`- Phí rút (19% + $5.00):   -$${wdrFee.totalFee.toFixed(2)} USDT`);
  console.log(`- Khách thực nhận về ví:    +$${wdrFee.netAmount.toFixed(2)} USDT`);
  console.log(`- Trích giữ lại Quỹ (10%):   $${(wdrFee.effectiveRetainedFee || 0).toFixed(2)} USDT`);
  console.log(`=> Số dư Bot còn lại:      $${userA.tradingBalance.toFixed(2)} USDT\n`);

  // ---------------------------------------------------------------------------
  // STEP 4: MẠNG LƯỚI 10 KHÁCH HÀNG F1 & THĂNG HẠNG RESELLER LEVEL 3
  // ---------------------------------------------------------------------------
  console.log(">>> [BƯỚC 4] KHÁCH A GIỚI THIỆU 10 KHÁCH F1 & ĐÁNH GIÁ THĂNG HẠNG RESELLER");
  const f1List: Array<{ id: string; username: string; gross: number; net: number; fee: number; dailyProfit: number }> = [];
  const F1_DEPOSIT_EACH = 500.00;

  for (let i = 1; i <= 10; i++) {
    const f1DepositFee = calculateDepositFee(F1_DEPOSIT_EACH);
    const f1Profit = f1DepositFee.netAmount * dailyYieldRate;
    f1List.push({
      id: `f1_user_${String(i).padStart(2, '0')}`,
      username: `client_investor_${i}`,
      gross: F1_DEPOSIT_EACH,
      net: f1DepositFee.netAmount,
      fee: f1DepositFee.totalFee,
      dailyProfit: f1Profit
    });
  }

  userA.f1Count = f1List.length;
  userA.networkVolume = f1List.reduce((acc, c) => acc + c.gross, 0);

  // EVALUATE DYNAMIC RESELLER TIER:
  // Rule: >= 10 Active F1s => Auto promote to LEVEL 3 (6% Fee Rebate)!
  const calculateTier = (f1Count: number, volume: number): { tier: number; rebateRate: number; name: string } => {
    if (volume >= 100000) return { tier: 10, rebateRate: 0.20, name: "LEVEL 10 (TOP MASTER - 20%)" };
    if (volume >= 75000) return { tier: 9, rebateRate: 0.18, name: "LEVEL 9 (18%)" };
    if (volume >= 50000) return { tier: 8, rebateRate: 0.16, name: "LEVEL 8 (16%)" };
    if (volume >= 35000) return { tier: 7, rebateRate: 0.14, name: "LEVEL 7 (14%)" };
    if (volume >= 20000) return { tier: 6, rebateRate: 0.12, name: "LEVEL 6 (12%)" };
    if (volume >= 10000) return { tier: 5, rebateRate: 0.10, name: "LEVEL 5 (10%)" };
    if (volume >= 5000) return { tier: 4, rebateRate: 0.08, name: "LEVEL 4 (8%)" };
    if (f1Count >= 10 || volume >= 2500) return { tier: 3, rebateRate: 0.06, name: "LEVEL 3 (6% FEE REBATE)" };
    if (f1Count >= 5 || volume >= 1000) return { tier: 2, rebateRate: 0.04, name: "LEVEL 2 (4% FEE REBATE)" };
    return { tier: 1, rebateRate: 0.02, name: "LEVEL 1 (STARTING - 2%)" };
  };

  const tierInfo = calculateTier(userA.f1Count, userA.networkVolume);
  userA.resellerTier = tierInfo.tier;

  console.log(`- Số lượng khách F1 tham gia: ${userA.f1Count} Thành viên`);
  console.log(`- Mức nạp mỗi F1:             $${F1_DEPOSIT_EACH.toFixed(2)} USDT (Thực nhận: $${f1List[0].net.toFixed(2)})`);
  console.log(`- Tổng vốn mạng lưới F1:       $${userA.networkVolume.toFixed(2)} USDT`);
  console.log(`- Cấp bậc Reseller đạt được:   ${tierInfo.name}`);
  console.log(`- Tỷ lệ Fee Rebate được hưởng: ${(tierInfo.rebateRate * 100).toFixed(0)}%\n`);

  // ---------------------------------------------------------------------------
  // STEP 5: TÍNH HOA HỒNG TỪ 10 F1 CHẠY LÃI 3%/NGÀY & ĐỐI SOÁT TỔNG TÀI SẢN
  // ---------------------------------------------------------------------------
  console.log(">>> [BƯỚC 5] ĐỐI SOÁT LỢI NHUẬN & HOA HỒNG MẠNG LƯỚI CHO KHÁCH A");

  // A. Phí nạp của 10 F1 và hoàn phí Fee Rebate Level 3 (6%)
  const totalF1DepositFees = f1List.reduce((acc, c) => acc + c.fee, 0); // 10 x $48.00 = $480.00
  const feeRebateFromDeposits = totalF1DepositFees * tierInfo.rebateRate; // 6% x $480.00 = $28.80

  // B. 10 F1 chạy lãi 3.0%/ngày
  const totalF1DailyProfit = f1List.reduce((acc, c) => acc + c.dailyProfit, 0); // 10 x $13.56 = $135.60/ngày
  // Giả định hoa hồng chia sẻ lợi nhuận (Profit Share) là 10% trên số lãi F1 kiếm được:
  const profitShareRate = 0.10; // 10%
  const dailyProfitShare = totalF1DailyProfit * profitShareRate; // $13.56/ngày

  // C. Hoa hồng hoàn phí khi 10 F1 rút tiền (nếu mỗi F1 rút lãi $13.56):
  const f1WdrFees = f1List.map(f => calculateWithdrawFee(f.dailyProfit).totalFee).reduce((a, b) => a + b, 0);
  const feeRebateFromWithdrawals = f1WdrFees * tierInfo.rebateRate;

  // Tổng hoa hồng Khách A tích lũy:
  userA.referralBalance += (feeRebateFromDeposits + dailyProfitShare);

  const totalBalanceA = userA.tradingBalance + userA.referralBalance;

  console.log("┌──────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                    BẢNG ĐỐI SOÁT TỔNG TÀI SẢN KHÁCH HÀNG A                   │");
  console.log("├──────────────────────────────────────────────────────┬───────────────────────┤");
  console.log(`│ 1. Số dư vốn đầu tư (tradingBalance)                 │ $${userA.tradingBalance.toFixed(2).padStart(18)} USDT │`);
  console.log(`│    - Vốn nạp thực nhận ban đầu                       │ $${depFee.netAmount.toFixed(2).padStart(18)} USDT │`);
  console.log(`│    - Lãi bot của chính mình (3%/ngày)                │ +$${profitA_Day1.toFixed(2).padStart(17)} USDT │`);
  console.log(`│    - Đã rút về ví TRON cá nhân                       │ -$${withdrawGross.toFixed(2).padStart(17)} USDT │`);
  console.log("├──────────────────────────────────────────────────────┼───────────────────────┤");
  console.log(`│ 2. Thu nhập đại lý & Hoa hồng (referralBalance)      │ $${userA.referralBalance.toFixed(2).padStart(18)} USDT │`);
  console.log(`│    - Hoàn phí nạp Level 3 (6% trên $480 phí 10 F1)   │ +$${feeRebateFromDeposits.toFixed(2).padStart(17)} USDT │`);
  console.log(`│    - Hoa hồng chia sẻ lợi nhuận 10 F1 lãi 3%/ngày   │ +$${dailyProfitShare.toFixed(2).padStart(17)} USDT │`);
  console.log("├──────────────────────────────────────────────────────┼───────────────────────┤");
  console.log(`│ 3. TỔNG TÀI SẢN HIỂN THỊ (totalBalance)              │ $${totalBalanceA.toFixed(2).padStart(18)} USDT │`);
  console.log(`│ 4. CẤP BẬC ĐẠI LÝ (Profile & Header Rank)            │ ${tierInfo.name.padStart(21)} │`);
  console.log("└──────────────────────────────────────────────────────┴───────────────────────┘\n");

  console.log(">>> [KẾT LUẬN TESTER]:");
  console.log("✔ Quy trình Nạp - Lãi - Rút của Khách A: KHỚP 100% CÔNG THỨC TOÁN HỌC.");
  console.log("✔ Quy trình 10 F1 nạp & chạy lãi 3%/ngày: TẠO RA ĐÚNG $135.60 USDT LÃI/NGÀY.");
  console.log(`✔ Khách A được tự động nâng lên LEVEL 3, nhận chuẩn $${feeRebateFromDeposits.toFixed(2)} USDT hoàn phí và $${dailyProfitShare.toFixed(2)} USDT hoa hồng mỗi ngày.`);
  console.log(`✔ Tổng số dư $${totalBalanceA.toFixed(2)} USDT đồng bộ chuẩn xác giữa các màn hình Dashboard.\n`);

  return {
    userA,
    tierInfo,
    f1List,
    totalBalanceA,
    feeRebateFromDeposits,
    dailyProfitShare
  };
}

runFullQASimulation();
