"""Spartan CFO Tiered Yield & Treasury Stress-Testing Simulation (2027 - 2029)
Compares Fixed 20% Yield Model vs Tiered Dynamic Yield Model.
Evaluates Capital Preservation, Admin Revenue, and 3-Pillar Treasury Reserve.
"""

import sys
import pandas as pd
import numpy as np

def simulate_comparison():
    if sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')

    start_clients = 20
    start_aum = 38638.80
    AVG_DEP = 750.0
    DEP_FEE = 750.0 * 0.09 + 3.0  # $70.50
    NET_DEP = 750.0 - DEP_FEE      # $679.50
    PERF_FEE_PCT = 0.20
    WDR_FEE_PCT = 0.04
    WDR_RATE = 0.02
    HWM_BUFFER_PCT = 0.15  # 15% of HWM channeled to Treasury Reserve Fund

    # Model A: Fixed 20% Model (Original simulate_2027_2029.py)
    # Model B: Tiered Dynamic Yield Model
    #   TVL < $250K: 20% gross / 16% net
    #   TVL $250K - $1M: 18% gross / 14.4% net
    #   TVL $1M - $5M: 15% gross / 12.0% net
    #   TVL > $5M: 12.5% gross / 10.0% net

    for model_name, is_tiered, use_hwm_buffer in [
        ("Fixed 20% Yield (Baseline)", False, False),
        ("Dynamic Tiered Yield (Institutional Preservation)", True, False),
        ("Dynamic Tiered Yield + Enhanced 3-Pillar Treasury", True, True),
    ]:
        client_balances = [start_aum / start_clients] * start_clients
        cum_admin_net = 0.0
        cum_reserve_wdr = 0.0
        cum_hwm_buffer = 0.0
        cum_gross_dep_fees = 0.0
        cum_gross_hwm = 0.0
        cum_gross_wdr = 0.0

        records = []

        for m in range(1, 37):
            year = 2026 + ((m - 1) // 12) + 1
            new_c = 2 if m % 2 == 1 else 1

            # Deposit fees
            m_dep_fees = new_c * DEP_FEE
            cum_gross_dep_fees += m_dep_fees
            for _ in range(new_c):
                client_balances.append(NET_DEP)

            cur_tvl_pre = sum(client_balances)

            if not is_tiered:
                gross_yield = 0.20
            else:
                if cur_tvl_pre < 250000:
                    gross_yield = 0.20
                elif cur_tvl_pre < 1000000:
                    gross_yield = 0.18
                elif cur_tvl_pre < 5000000:
                    gross_yield = 0.15
                else:
                    gross_yield = 0.125

            # Trading profit
            m_gross_profit = 0.0
            m_hwm = 0.0
            for i in range(len(client_balances)):
                b = client_balances[i]
                p = b * gross_yield
                hwm = p * PERF_FEE_PCT
                client_balances[i] = b + (p - hwm)
                m_gross_profit += p
                m_hwm += hwm

            cum_gross_hwm += m_hwm

            # Withdrawals (2% monthly profit taking)
            m_wdr_gross = sum(client_balances) * WDR_RATE
            m_wdr_fee = m_wdr_gross * WDR_FEE_PCT
            cum_gross_wdr += m_wdr_fee
            m_res_wdr = m_wdr_fee * 0.30
            m_adm_wdr = m_wdr_fee * 0.70

            for i in range(len(client_balances)):
                client_balances[i] -= (client_balances[i] * WDR_RATE)

            # HWM buffer deduction if enabled
            if use_hwm_buffer:
                m_buffer = m_hwm * HWM_BUFFER_PCT
                m_adm_hwm = m_hwm - m_buffer
            else:
                m_buffer = 0.0
                m_adm_hwm = m_hwm

            cum_hwm_buffer += m_buffer
            cum_reserve_wdr += m_res_wdr

            m_admin_net = m_dep_fees + m_adm_hwm + m_adm_wdr
            cum_admin_net += m_admin_net

            tvl = sum(client_balances)
            cold_reserve = tvl * 0.10
            total_treasury = cold_reserve + cum_reserve_wdr + cum_hwm_buffer

            records.append({
                "m": m,
                "year": year,
                "clients": len(client_balances),
                "tvl": tvl,
                "yield_rate": gross_yield,
                "m_profit": m_gross_profit,
                "m_hwm": m_hwm,
                "m_dep_fees": m_dep_fees,
                "m_wdr_fee": m_wdr_fee,
                "m_admin_net": m_admin_net,
                "cold_reserve": cold_reserve,
                "cum_res_wdr": cum_reserve_wdr,
                "cum_hwm_buffer": cum_hwm_buffer,
                "total_treasury": total_treasury,
                "avg_balance": tvl / len(client_balances)
            })

        df = pd.DataFrame(records)
        final = df.iloc[-1]

        print("=" * 95)
        print(f"MODEL: {model_name}")
        print("=" * 95)
        for y in [2027, 2028, 2029]:
            df_y = df[df["year"] == y]
            last_y = df_y.iloc[-1]
            print(f"Year {y}:")
            print(f"  - Active Clients: {last_y['clients']}")
            print(f"  - End TVL: ${last_y['tvl']:,.2f} USDT")
            print(f"  - Terminal Gross Yield: {last_y['yield_rate']*100:.1f}% / month (Net: {last_y['yield_rate']*80:.1f}%)")
            print(f"  - Admin Net Revenue (Year): ${df_y['m_admin_net'].sum():,.2f} USDT")
            print(f"  - Treasury Reserve (End Year): ${last_y['total_treasury']:,.2f} USDT")
            print(f"  - Avg Client Balance: ${last_y['avg_balance']:,.2f} USDT")

        print("-" * 95)
        print(f"CUMULATIVE 3-YEAR TOTALS (2027-2029):")
        print(f"  - Gross TVL at 2029-End: ${final['tvl']:,.2f} USDT")
        print(f"  - Cumulative Admin Net Revenue: ${cum_admin_net:,.2f} USDT")
        print(f"  - Cumulative Gross HWM Fees: ${cum_gross_hwm:,.2f} USDT")
        print(f"  - Cumulative Deposit Fees: ${cum_gross_dep_fees:,.2f} USDT")
        print(f"  - Cumulative Withdrawal Fees: ${cum_gross_wdr:,.2f} USDT")
        print(f"  - Final Treasury Reserve Fund: ${final['total_treasury']:,.2f} USDT")
        print(f"      * 10% TVL Cold Vault: ${final['cold_reserve']:,.2f} USDT")
        print(f"      * 30% Withdrawal Fee Allocation: ${final['cum_res_wdr']:,.2f} USDT")
        print(f"      * HWM Surplus Reserve Buffer: ${final['cum_hwm_buffer']:,.2f} USDT")
        print("=" * 95 + "\n")

if __name__ == "__main__":
    simulate_comparison()
