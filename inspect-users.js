const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIRESTORE_REST_BASE = "https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents";

async function inspectUsers() {
  console.log("==========================================================================");
  console.log("  🔍 ĐANG KIỂM TRA TOÀN BỘ TÀI KHOẢN TRÊN FIREBASE REALTIME DATABASE & FIRESTORE");
  console.log("==========================================================================");

  // 1. Inspect Realtime Database users
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users.json`);
    if (res.ok) {
      const data = await res.json();
      console.log("\n📍 REALTIME DATABASE USERS:");
      if (data) {
        Object.keys(data).forEach((id) => {
          const u = data[id];
          console.log(`  • Document ID: "${id}" | telegramId: "${u.telegramId}" | username: "@${u.username}" | firstName: "${u.firstName}" | balance: $${u.tradingBalance}`);
        });
      } else {
        console.log("  (Không có dữ liệu users trên RTDB)");
      }
    }
  } catch (e) {
    console.error("Lỗi đọc RTDB:", e);
  }

  // 2. Inspect Firestore Database users
  try {
    const res = await fetch(`${FIRESTORE_REST_BASE}/users`);
    if (res.ok) {
      const data = await res.json();
      console.log("\n📍 FIRESTORE DATABASE USERS:");
      if (data && data.documents) {
        data.documents.forEach((doc) => {
          const docId = doc.name.split('/').pop();
          const fields = doc.fields || {};
          console.log(`  • Document ID: "${docId}" | username: "@${fields.username?.stringValue}" | firstName: "${fields.firstName?.stringValue}"`);
        });
      } else {
        console.log("  (Không có dữ liệu users trên Firestore)");
      }
    }
  } catch (e) {
    console.error("Lỗi đọc Firestore:", e);
  }
}

inspectUsers();
