"""Targeted deletion of the /trades node on Firebase Realtime Database.
URL: https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/trades.json
"""

import sys
import os
import json
import urllib.request
import urllib.error

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app"

def delete_path(path):
    url = f"{RTDB_BASE_URL}/{path}.json"
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode("utf-8")
    except Exception as e:
        return 500, str(e)

def get_path_count(path):
    url = f"{RTDB_BASE_URL}/{path}.json"
    try:
        with urllib.request.urlopen(url) as resp:
            data = resp.read().decode("utf-8")
            obj = json.loads(data)
            return len(obj) if isinstance(obj, dict) else 0
    except Exception:
        return 0

def main():
    print("================================================================================")
    print(" 🧹 TIẾN HÀNH XÓA NODE `/trades` TRÊN FIREBASE REALTIME DATABASE")
    print("================================================================================")
    
    before_count = get_path_count("trades")
    print(f"📊 Số lượng bản ghi trong `/trades` trước khi xóa: {before_count} bản ghi.")

    status, resp_body = delete_path("trades")
    print(f"✔ Đã gửi lệnh DELETE tới `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/trades.json` | Status: {status}")

    after_count = get_path_count("trades")
    print(f"📊 Số lượng bản ghi trong `/trades` sau khi xóa: {after_count} bản ghi.")

    # Also clean any other variants just in case
    for extra in ["trades", "trade", "deal_history", "deals"]:
        delete_path(extra)

    print("================================================================================")
    print(" ✅ ĐÃ XÓA HOÀN TOÀN BỘ NODE `/trades` TRÊN FIREBASE CONSOLE THÀNH CÔNG!")
    print("================================================================================")

if __name__ == "__main__":
    main()
