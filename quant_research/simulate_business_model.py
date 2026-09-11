"""Simulate 12-Month Business Model Projection for Spartan Mini App.

Scenario:
- Months 1-3: 5 initial clients deposit $500 each ($2,500 gross deposit).
- Months 4-12: 15 additional clients deposit $500 each (1.67 clients/month -> 1-2 per month, total 20 clients = $10,000 gross deposit).
- Fee Schedule (Default Fee Engine):
  * Deposit Fee: 9% + $3.00 Gas -> $48 per $500 deposit (Net deposit = $452 into bot)
  * Performance Fee (HWM): 20% of net monthly trading profit
  * Withdrawal Fee: Tier 3 (>90 days) = 4% + $5 Gas
  * Bot Yield: ~25% monthly return on active trading AUM
"""

import sys
import os
import pandas as pd
import numpy as np

def run_simulation():
    DEPOSIT_GROSS = 500.0
    DEP_FEE_PCT = 0.09
    DEP_GAS_FEE = 3.0
    DEP_FEE_TOTAL = DEPOSIT_GROSS * DEP_FEE_PCT + DEP_GAS_FEE  # $48.00
    NET_DEP_PER_CLIENT = DEPOSIT_GROSS - DEP_FEE_TOTAL  # $452.00
    
    BOT_MONTHLY_YIELD = 0.25  # 25% per month average
    PERFORMANCE_FEE_PCT = 0.20 # 20% HWM Performance fee
    
    # Timeline mapping: client additions per month
    # M1: 5 clients
    # M2: 0, M3: 0
    # M4..M12: 15 clients distributed across 9 months (2, 1, 2, 1, 2, 2, 1, 2, 2)
    clients_added = [5, 0, 0, 2, 1, 2, 1, 2, 2, 1, 2, 2]
    
    active_clients = 0
    total_gross_deposited = 0.0
    total_deposit_fees_collected = 0.0
    total_performance_fees_collected = 0.0
    
    client_balances = [] # list of current net balances for each client
    
    monthly_report = []
    
    for month_idx in range(12):
        month = month_idx + 1
        new_c = clients_added[month_idx]
        
        # New deposits this month
        new_gross_dep = new_c * DEPOSIT_GROSS
        new_dep_fee = new_c * DEP_FEE_TOTAL
        new_net_dep = new_c * NET_DEP_PER_CLIENT
        
        total_gross_deposited += new_gross_dep
        total_deposit_fees_collected += new_dep_fee
        
        for _ in range(new_c):
            client_balances.append(NET_DEP_PER_CLIENT)
            
        # Run Bot Yield on existing balances
        month_gross_profit = 0.0
        month_perf_fee = 0.0
        
        for i in range(len(client_balances)):
            bal = client_balances[i]
            gross_p = bal * BOT_MONTHLY_YIELD
            p_fee = gross_p * PERFORMANCE_FEE_PCT
            net_p = gross_p - p_fee
            
            client_balances[i] = bal + net_p
            month_gross_profit += gross_p
            month_perf_fee += p_fee
            
        total_performance_fees_collected += month_perf_fee
        current_aum = sum(client_balances)
        avg_client_bal = current_aum / len(client_balances) if client_balances else 0.0
        
        monthly_report.append({
            "month": month,
            "new_clients": new_c,
            "total_clients": len(client_balances),
            "new_deposit_gross": new_gross_dep,
            "deposit_fee_revenue": new_dep_fee,
            "monthly_bot_profit": month_gross_profit,
            "performance_fee_revenue": month_perf_fee,
            "total_admin_revenue_month": new_dep_fee + month_perf_fee,
            "total_aum": current_aum,
            "avg_client_balance": avg_client_bal
        })

    df = pd.DataFrame(monthly_report)
    
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    print(f"==========================================================================")
    print(f"   SPARTAN MINI APP - 12-MONTH BUSINESS MODEL SIMULATION REPORT           ")
    print(f"==========================================================================")
    print(f"Model Parameters:")
    print(f"  - Client Deposit: $500.00 USD / client")
    print(f"  - Deposit Fee: 9% + $3.00 Gas = $48.00 USD (Net into Bot = $452.00 USD)")
    print(f"  - Bot Monthly Yield: 25.0% / month")
    print(f"  - Performance Fee (HWM): 20.0% of net monthly profit")
    print(f"  - Client Acquisition: 5 clients M1-M3, +15 clients M4-M12 (Total: 20 clients)\n")
    
    print("-" * 110)
    print(f"{'Tháng':<6} | {'Khách Mới':<10} | {'Tổng Khách':<11} | {'Phí Nạp ($)':<12} | {'Phí HWM ($)':<12} | {'Doanh Thu Admin/Tháng':<22} | {'Tổng AUM Bot ($)':<18}")
    print("-" * 110)
    
    for row in monthly_report:
        print(f"M{row['month']:<5} | +{row['new_clients']:<9} | {row['total_clients']:<11} | ${row['deposit_fee_revenue']:>10,.2f} | ${row['performance_fee_revenue']:>10,.2f} | ${row['total_admin_revenue_month']:>20,.2f} | ${row['total_aum']:>16,.2f}")
        
    print("-" * 110)
    total_rev = total_deposit_fees_collected + total_performance_fees_collected
    print(f"TỔNG CỘNG 12 THÁNG:")
    print(f"  - Tổng vốn khách nạp (Gross Deposits): ${total_gross_deposited:,.2f} USD")
    print(f"  - Tổng Phí Nạp thu được (Deposit Fees): ${total_deposit_fees_collected:,.2f} USD")
    print(f"  - Tổng Phí Quản Lý Lợi Nhuận (HWM Performance Fees): ${total_performance_fees_collected:,.2f} USD")
    print(f"  - 🏆 TỔNG DOANH THU RÒNG ADMIN (Total Admin Revenue): ${total_rev:,.2f} USD")
    print(f"  - 💎 TỔNG TÀI SẢN BOT QUẢN LÝ (Final AUM): ${df['total_aum'].iloc[-1]:,.2f} USD")
    print(f"  - 💰 Giá trị tài khoản trung bình / Khách hàng: ${df['avg_client_balance'].iloc[-1]:,.2f} USD (Gốc $500 -> Lời thành ${df['avg_client_balance'].iloc[-1]:,.2f})")
    print("=" * 110)

if __name__ == "__main__":
    run_simulation()
