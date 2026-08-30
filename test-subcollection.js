async function testFirestoreSubcollection() {
  const telegramId = "494232782";
  const txId = "TX-998877";

  const txData = {
    id: txId,
    userId: telegramId,
    username: "john_trader",
    type: "DEPOSIT",
    grossAmount: 1000.00,
    feeAmount: 93.00,
    netAmount: 907.00,
    status: "PENDING",
    memoCode: "SPARTAN_123456",
    createdAt: new Date().toISOString()
  };

  // Subcollection path: users/494232782/transactions/TX-998877
  const url = `https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents/users/${telegramId}/transactions/${txId}?updateMask.fieldPaths=id&updateMask.fieldPaths=userId&updateMask.fieldPaths=username&updateMask.fieldPaths=type&updateMask.fieldPaths=grossAmount&updateMask.fieldPaths=feeAmount&updateMask.fieldPaths=netAmount&updateMask.fieldPaths=status&updateMask.fieldPaths=memoCode&updateMask.fieldPaths=createdAt`;

  const fields = {
    id: { stringValue: txId },
    userId: { stringValue: telegramId },
    username: { stringValue: "john_trader" },
    type: { stringValue: "DEPOSIT" },
    grossAmount: { doubleValue: 1000.00 },
    feeAmount: { doubleValue: 93.00 },
    netAmount: { doubleValue: 907.00 },
    status: { stringValue: "PENDING" },
    memoCode: { stringValue: "SPARTAN_123456" },
    createdAt: { timestampValue: new Date().toISOString() }
  };

  console.log("🔥 TESTING FIRESTORE SUBCOLLECTION CREATION:", url);

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });

    const data = await res.json();
    if (res.ok) {
      console.log("✅ FIRESTORE SUBCOLLECTION SUCCESSFUL! PATH:", data.name);
    } else {
      console.error("❌ FIRESTORE SUBCOLLECTION ERROR:", data);
    }
  } catch (err) {
    console.error("❌ EXCEPTION:", err);
  }
}

testFirestoreSubcollection();
