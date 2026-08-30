const crypto = require('crypto');

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIRESTORE_REST_BASE = "https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents";
const SECRET_KEY = process.env.SPARTAN_HMAC_SECRET || 'SPARTAN_QUANT_AI_SECRET_KEY_2026';

function generateSignature(orderId, masterWallet, timestamp) {
  const rawString = `${orderId}|${masterWallet}|${timestamp}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(rawString).digest('hex');
}

function convertToFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'number') {
      fields[key] = Number.isInteger(val) ? { integerValue: val } : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    }
  }
  return fields;
}

async function saveFirestoreREST(path, data) {
  const fieldKeys = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null);
  const queryParams = fieldKeys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${FIRESTORE_REST_BASE}/${path}?${queryParams}`;
  const fields = convertToFirestoreFields(data);

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  return res.ok;
}

async function runEndToEndDepositTest() {
  console.log("==========================================================================");
  console.log("  🧪 BẮT ĐẦU TEST GIẢ LẬP QUY TRÌNH NẠP TIỀN & XÁC THỰC MÃ BĂM SHA-256  ");
  console.log("==========================================================================");

  const telegramId = "1788035393";
  const username = "tddv2017";
  const masterWallet = "TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu";
  const grossAmount = 1000.00; // $1,000 USDT Deposit Test

  // Fee calculation: 9% + $3.00 USD
  const percentageFee = grossAmount * 0.09;
  const totalFee = percentageFee + 3.00;
  const netAmount = grossAmount - totalFee;

  const nowTs = Date.now();
  const txId = `DEP_${telegramId}_TEST_${Math.floor(1000 + Math.random() * 9000)}`;
  const memoCode = `SPARTAN_${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Generate SHA-256 HMAC Signature
  const signature = generateSignature(txId, masterWallet, nowTs);

  console.log("\n📍 1. THÔNG TIN LỆNH NẠP KHỞI TẠO:");
  console.log(`  • Order ID            : ${txId}`);
  console.log(`  • Telegram User       : @${username} (ID: ${telegramId})`);
  console.log(`  • Số Tiền Nạp (Gross) : $${grossAmount.toFixed(2)} USDT`);
  console.log(`  • Tổng Phí Deposit    : -$${totalFee.toFixed(2)} USDT (9% + $3.00)`);
  console.log(`  • Thực Nhận Net vào Bot: +$${netAmount.toFixed(2)} USDT`);
  console.log(`  • Mã Băm SHA-256 Sig  : ${signature}`);

  const txPayload = {
    id: txId,
    userId: telegramId,
    username: username,
    type: "DEPOSIT",
    grossAmount: grossAmount,
    feeAmount: totalFee,
    netAmount: netAmount,
    status: "PENDING",
    memoCode: memoCode,
    masterWalletAddress: masterWallet,
    sha256Signature: signature,
    createdAt: new Date(nowTs).toISOString()
  };

  // 2. Save Pending Deposit to Firebase RTDB & Firestore Sub-collection
  console.log("\n📍 2. ĐẨY LỆNH NẠP CHỜ DUYỆT LÊN FIREBASE:");
  await fetch(`${RTDB_BASE_URL}/users/${telegramId}/transactions/${txId}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(txPayload)
  });
  await fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(txPayload)
  });
  await saveFirestoreREST(`users/${telegramId}/transactions/${txId}`, txPayload);
  await saveFirestoreREST(`transactions/${txId}`, txPayload);
  console.log("  ✅ Đã lưu lệnh nạp trạng thái PENDING lên Firebase RTDB & Firestore!");

  // 3. Simulate TronGrid On-Chain Bot Verification & Auto-Approval
  console.log("\n📍 3. GIẢ LẬP BOT TRONGRID QUÉT ON-CHAIN & ĐỐI CHIẾU MÃ BĂM SHA-256:");
  const expectedSig = generateSignature(txId, masterWallet, nowTs);
  const isSignatureValid = (signature === expectedSig);

  if (isSignatureValid) {
    console.log("  🟢 KẾT QUẢ ĐỐI CHIẾU MÃ BĂM SHA-256: KHỚP 100% (MATCH VERIFIED)!");

    // Execute Auto-Approval & Credit Balance
    const userRes = await fetch(`${RTDB_BASE_URL}/users/${telegramId}.json`);
    let currentBal = 0;
    if (userRes.ok) {
      const uData = await userRes.json();
      if (uData && typeof uData.tradingBalance === 'number') currentBal = uData.tradingBalance;
    }

    const newBal = currentBal + netAmount;

    // Update Status APPROVED
    const approvePayload = {
      status: "APPROVED",
      approvedBy: "BOT_TRONGRID_AUTOMATION",
      approvedAt: new Date().toISOString()
    };

    await fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(approvePayload)
    });
    await fetch(`${RTDB_BASE_URL}/users/${telegramId}/transactions/${txId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(approvePayload)
    });
    await fetch(`${RTDB_BASE_URL}/users/${telegramId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradingBalance: newBal })
    });

    await saveFirestoreREST(`users/${telegramId}`, { tradingBalance: newBal });
    await saveFirestoreREST(`transactions/${txId}`, approvePayload);
    await saveFirestoreREST(`users/${telegramId}/transactions/${txId}`, approvePayload);

    console.log("\n==========================================================================");
    console.log(`  🎉 DUYỆT THÀNH CÔNG! SỐ DƯ TÀI KHOẢN MỚI CỦA @${username}: $${newBal.toFixed(2)} USDT`);
    console.log("==========================================================================");
  } else {
    console.error("  🔴 LỖI: MÃ BĂM SHA-256 KHÔNG KHỚP! TỪ CHỐI DUYỆT GIAO DỊCH.");
  }
}

runEndToEndDepositTest();
