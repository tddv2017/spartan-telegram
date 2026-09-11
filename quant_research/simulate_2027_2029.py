"""3-Year Comprehensive Business Simulation (2027 - 2029 / 36 Months)
Carrying forward 2026 baseline (20 clients, $38,638.80 AUM).

Parameters:
- 1.5 new clients/month (18 clients/year, +54 new clients over 36 months -> Total 74 clients)
- Average deposit per client: $750.00 USDT (range $500 - $1,000)
- Deposit Fee: 9% + $3.00 Gas = $70.50 per $750 deposit (Net into Bot = $679.50)
- Quant Bot Yield: 20.0% / month (Conservative institutional yield)
- HWM Performance Fee: 20.0% of net monthly profit
- Withdrawal Fee: Tier 3 (>90d) = 4% + $5.00 Gas (with 30% auto-allocated to Treasury Reserve, 70% to Admin Net Revenue)
- Policy Reserve: 10% of TVL held in Cold Vault
"""

import sys
import os
import pandas as pd
import numpy as np

def run_3year_simulation():
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    # Baseline carrying forward from 2026
    start_clients = 20
    start_aum = 38638.80
    
    AVG_DEPOSIT = 750.0  # Mix of $500 - $1,000
    DEP_FEE_PCT = 0.09
    DEP_GAS_FEE = 3.0
    DEP_FEE_PER_CLIENT = AVG_DEPOSIT * DEP_FEE_PCT + DEP_GAS_FEE  # $70.50
    NET_DEP_PER_CLIENT = AVG_DEPOSIT - DEP_FEE_PER_CLIENT        # $679.50

    BOT_MONTHLY_YIELD = 0.20        # 20% per month conservative
    PERFORMANCE_FEE_PCT = 0.20      # 20% HWM
    WITHDRAWAL_FEE_PCT = 0.04       # 4% Tier 3
    TREASURY_RESERVE_RATIO = 0.30   # 30% of withdrawal fee to Reserve
    ADMIN_REVENUE_RATIO = 0.70      # 70% of withdrawal fee to Admin

    # Maintain client balances list
    # Initialize with 20 existing clients evenly sharing start_aum
    client_balances = [start_aum / start_clients] * start_clients

    cumulative_gross_deposit_fees = 0.0
    cumulative_hwm_fees = 0.0
    cumulative_withdrawal_fees = 0.0
    cumulative_treasury_reserve_from_fees = 0.0
    cumulative_admin_net_revenue = 0.0
    cumulative_client_profit_withdrawn = 0.0

    monthly_records = []

    # 36 Months (Year 2027 = M1..12, Year 2028 = M13..24, Year 2029 = M25..36)
    for m in range(1, 37):
        year = 2026 + ((m - 1) // 12) + 1
        m_in_year = ((m - 1) % 12) + 1

        # Add 1.5 clients per month (alternate 1 and 2 clients)
        new_clients = 2 if m % 2 == 1 else 1
        
        # Gross Deposits this month
        month_gross_deposits = new_clients * AVG_DEPOSIT
        month_deposit_fees = new_clients * DEP_FEE_PER_CLIENT
        month_net_deposits = new_clients * NET_DEP_PER_CLIENT

        for _ in range(new_clients):
            client_balances.append(NET_DEP_PER_CLIENT)

        # Execute Bot Monthly Yield & HWM Fee
        month_trading_gross_profit = 0.0
        month_hwm_fee = 0.0

        for i in range(len(client_balances)):
            bal = client_balances[i]
            gross_p = bal * BOT_MONTHLY_YIELD
            hwm_fee = gross_p * PERFORMANCE_FEE_PCT
            net_p = gross_p - hwm_fee
            
            client_balances[i] = bal + net_p
            month_trading_gross_profit += gross_p
            month_hwm_fee += hwm_fee

        # Simulate 2% monthly client profit harvesting / withdrawals
        month_client_withdrawals_gross = sum(client_balances) * 0.02
        month_withdrawal_fee = month_client_withdrawals_gross * WITHDRAWAL_FEE_PCT
        month_treasury_reserve_fee = month_withdrawal_fee * TREASURY_RESERVE_RATIO
        month_admin_withdrawal_fee = month_withdrawal_fee * ADMIN_REVENUE_RATIO
        month_client_net_withdrawn = month_client_withdrawals_gross - month_withdrawal_fee

        # Deduct withdrawals proportionally from client balances
        for i in range(len(client_balances)):
            client_balances[i] -= (client_balances[i] * 0.02)

        # Accumulate metrics
        cumulative_gross_deposit_fees += month_deposit_fees
        cumulative_hwm_fees += month_hwm_fee
        cumulative_withdrawal_fees += month_withdrawal_fee
        cumulative_treasury_reserve_from_fees += month_treasury_reserve_fee
        
        month_admin_net_rev = month_deposit_fees + month_hwm_fee + month_admin_withdrawal_fee
        cumulative_admin_net_revenue += month_admin_net_rev
        cumulative_client_profit_withdrawn += month_client_net_withdrawn

        current_tvl = sum(client_balances)
        treasury_policy_reserve_10pct = current_tvl * 0.10
        total_treasury_reserve_fund = treasury_policy_reserve_10pct + cumulative_treasury_reserve_from_fees

        monthly_records.append({
            "month_global": m,
            "year": year,
            "month_in_year": m_in_year,
            "new_clients": new_clients,
            "total_clients": len(client_balances),
            "month_gross_deposits": month_gross_deposits,
            "month_deposit_fees": month_deposit_fees,
            "month_trading_gross_profit": month_trading_gross_profit,
            "month_hwm_fee": month_hwm_fee,
            "month_withdrawal_fee": month_withdrawal_fee,
            "month_admin_net_revenue": month_admin_net_rev,
            "month_treasury_reserve_added": month_treasury_reserve_fee,
            "current_tvl": current_tvl,
            "total_treasury_reserve": total_treasury_reserve_fund,
            "avg_client_balance": current_tvl / len(client_balances)
        })

    df = pd.DataFrame(monthly_records)

    print("==========================================================================================================")
    print("   SPARTAN QUANT SYSTEM - 3-YEAR LONG-TERM BUSINESS PROJECTION (2027 - 2029)                            ")
    print("==========================================================================================================")
    print("Mô hình tăng trưởng: +1.5 khách/tháng | Nạp bình quân $750U/khách | Phí HWM 20% | Yield Bot 20%/tháng\n")

    # Yearly Summaries
    for y in [2027, 2028, 2029]:
        df_y = df[df["year"] == y]
        last_m = df_y.iloc[-1]
        
        y_gross_dep = df_y["month_gross_deposits"].sum()
        y_dep_fees = df_y["month_deposit_fees"].sum()
        y_hwm_fees = df_y["month_hwm_fee"].sum()
        y_wdr_fees = df_y["month_withdrawal_fee"].sum()
        y_gross_rev = y_dep_fees + y_hwm_fees + y_wdr_fees
        y_admin_net_rev = df_y["month_admin_net_revenue"].sum()
        
        print(f"----------------------------------------------------------------------------------------------------------")
        print(f"📌 TỔNG KẾT NĂM {y}:")
        print(f"  • Số lượng Khách hàng Cuối Năm: {last_m['total_clients']} khách hàng")
        print(f"  • Tổng Vốn Nạp Mới Trong Năm: ${y_gross_dep:,.2f} USDT")
        print(f"  • DOANH THU GỘP HỆ THỐNG (Gross Revenue): ${y_gross_rev:,.2f} USDT")
        print(f"     - Trong đó Phí Nạp (9%+$3): ${y_dep_fees:,.2f} USDT")
        print(f"     - Trong đó Phí HWM (20% Lãi): ${y_hwm_fees:,.2f} USDT")
        print(f"     - Trong đó Phí Rút Tiền (4%): ${y_wdr_fees:,.2f} USDT")
        print(f"  • 🏆 DOANH THU THUẦN ADMIN (Net Admin Revenue): ${y_admin_net_rev:,.2f} USDT")
        print(f"  • 💎 TỔNG TÀI SẢN BOT QUẢN LÝ (TVL / AUM): ${last_m['current_tvl']:,.2f} USDT")
        print(f"  • 🛡️ QUỸ DỰ PHÒNG KHO BẠC (Treasury Reserve Fund): ${last_m['total_treasury_reserve']:,.2f} USDT")
        print(f"  • 💰 Tài Khoản Bình Quân / Khách Hàng: ${last_m['avg_client_balance']:,.2f} USDT")

    final_m = df.iloc[-1]
    total_3y_gross_dep = df["month_gross_deposits"].sum() + 10000.0 # adding 2026 base
    total_3y_admin_net = df["month_admin_net_revenue"].sum() + 8359.70 # adding 2026 base

    print("\n==========================================================================================================")
    print("🏆 BẢNG TỔNG KẾT TÍCH LŨY 3 NĂM (THỜI ĐIỂM CUỐI NĂM 2029):")
    print(f"  - Tổng số khách hàng hoạt động: {final_m['total_clients']} khách hàng")
    print(f"  - Tổng TVL Bot đang quản trị: ${final_m['current_tvl']:,.2f} USDT")
    print(f"  - 🛡️ Tổng Quỹ Dự Phòng Kho Bạc (Treasury Reserve): ${final_m['total_treasury_reserve']:,.2f} USDT")
    print(f"  - 🏆 TỔNG DOANH THU THUẦN TÍCH LŨY ADMIN (2026-2029): ${total_3y_admin_net:,.2f} USDT")
    print("==========================================================================================================")

if __name__ == "__main__":
    run_3year_simulation()
