const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIRESTORE_REST_BASE = "https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents";

async function migrateAdminAccount() {
  console.log("==========================================================================");
  console.log("  🔄 ĐANG CHUYỂN DỮ LIỆU TÀI KHOẢN ADMIN SANG TELEGRAM ID THỰC 494232782");
  console.log("==========================================================================");

  const realId = "494232782";
  const dummyId = "1788035393";

  // 1. Read test account balance from 1788035393
  let tradingBalance = 907.00;
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${dummyId}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.tradingBalance === 'number') {
        tradingBalance = data.tradingBalance;
      }
    }
  } catch (e) {}

  console.log(`📍 Số dư cần chuyển sang tài khoản thực ID ${realId}: $${tradingBalance.toFixed(2)} USDT`);

  const realUserPayload = {
    telegramId: realId,
    username: "tddv2017",
    firstName: "Dung",
    role: "ADMIN",
    tradingBalance: tradingBalance,
    referralBalance: 0.00,
    referralCode: `SPARTAN_${realId}`,
    resellerTier: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 2. Update real user 494232782 on RTDB
  await fetch(`${RTDB_BASE_URL}/users/${realId}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(realUserPayload)
  });
  console.log(`✅ RTDB Users: Đã cập nhật tài khoản ID ${realId} thành ADMIN với số dư $${tradingBalance.toFixed(2)}!`);

  // 3. Update real user 494232782 on Firestore
  const fields = {
    telegramId: { stringValue: realId },
    username: { stringValue: "tddv2017" },
    firstName: { stringValue: "Dung" },
    role: { stringValue: "ADMIN" },
    tradingBalance: { doubleValue: tradingBalance },
    referralBalance: { doubleValue: 0.00 },
    referralCode: { stringValue: `SPARTAN_${realId}` },
    resellerTier: { integerValue: 1 },
    updatedAt: { timestampValue: new Date().toISOString() }
  };

  await fetch(`${FIRESTORE_REST_BASE}/users/${realId}?updateMask.fieldPaths=telegramId&updateMask.fieldPaths=username&updateMask.fieldPaths=firstName&updateMask.fieldPaths=role&updateMask.fieldPaths=tradingBalance&updateMask.fieldPaths=referralBalance&updateMask.fieldPaths=referralCode&updateMask.fieldPaths=resellerTier&updateMask.fieldPaths=updatedAt`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  console.log(`✅ Firestore Users: Đã cập nhật document users/${realId}!`);

  // 4. Migrate transactions from 1788035393 to 494232782
  try {
    const txRes = await fetch(`${RTDB_BASE_URL}/transactions.json`);
    if (txRes.ok) {
      const txData = await txRes.json();
      if (txData) {
        for (const [txId, tx] of Object.entries(txData)) {
          if (tx.userId === dummyId) {
            tx.userId = realId;
            // Update transaction to point to real ID 494232782
            await fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(tx)
            });
            await fetch(`${RTDB_BASE_URL}/users/${realId}/transactions/${txId}.json`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(tx)
            });
          }
        }
        console.log(`✅ Giao dịch: Đã chuyển toàn bộ lịch sử nạp rút sang tài khoản thực ID ${realId}!`);
      }
    }
  } catch (e) {}

  // 5. Delete test fallback ID 1788035393
  await fetch(`${RTDB_BASE_URL}/users/${dummyId}.json`, { method: "DELETE" });
  await fetch(`${FIRESTORE_REST_BASE}/users/${dummyId}`, { method: "DELETE" });
  console.log(`🧹 Đã xóa sạch tài khoản giả lập test ID ${dummyId}!`);

  console.log("\n==========================================================================");
  console.log(`  🎉 CHUYỂN ĐỔI THÀNH CÔNG! HỆ THỐNG GIỜ ĐÂY DÙNG CHUẨN ID TELEGRAM THỰC ${realId} (@tddv2017)`);
  console.log("==========================================================================");
}

migrateAdminAccount();
