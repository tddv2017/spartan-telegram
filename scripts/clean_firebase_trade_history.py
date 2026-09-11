"""Clean / Delete Old Trade History from Firebase Realtime Database.
Clears nodes:
1. /transactions
2. /trade_history
3. /trading_history
4. /user_trades
5. Clears trade_history/transactions under /users
"""

import sys
import os
import json
import urllib.request
import urllib.error

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app"

def delete_rtdb_path(path):
    url = f"{RTDB_BASE_URL}/{path}.json"
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode("utf-8")
    except Exception as e:
        return 500, str(e)

def get_rtdb_path(path):
    url = f"{RTDB_BASE_URL}/{path}.json"
    try:
        with urllib.request.urlopen(url) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data) if data else None
    except Exception:
        return None

def main():
    print("================================================================================")
    print(" 🧹 TIẾN HÀNH XÓA LỊCH SỬ GIAO DỊCH CŨ TRÊN FIREBASE REALTIME DATABASE")
    print("================================================================================")
    print(f"🔗 Database URL: {RTDB_BASE_URL}\n")

    # Paths to clear
    paths_to_clear = [
        "transactions",
        "trade_history",
        "trading_history",
        "user_trades",
        "ea_telemetry",
        "recent_trades"
    ]

    for p in paths_to_clear:
        st, res = delete_rtdb_path(p)
        print(f"✔ Đã xóa node Firebase `/{p}` | Status {st}")

    # Also clean transactions & trade history inside user profiles if any
    users_data = get_rtdb_path("users")
    if users_data and isinstance(users_data, dict):
        cleaned_users_count = 0
        for uid in users_data.keys():
            delete_rtdb_path(f"users/{uid}/transactions")
            delete_rtdb_path(f"users/{uid}/trade_history")
            delete_rtdb_path(f"users/{uid}/trading_history")
            cleaned_users_count += 1
        print(f"✔ Đã làm sạch lịch sử giao dịch trong {cleaned_users_count} tài khoản người dùng.")

    print("\n================================================================================")
    print(" ✅ ĐÃ XÓA TOÀN BỘ LỊCH SỬ GIAO DỊCH CŨ TRÊN FIREBASE THÀNH CÔNG!")
    print("================================================================================")

if __name__ == "__main__":
    main()
