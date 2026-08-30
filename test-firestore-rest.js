async function testFirestoreREST() {
  const telegramId = "494232782";
  const url = `https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents/users?documentId=${telegramId}`;

  const firestoreDocument = {
    fields: {
      telegramId: { stringValue: telegramId },
      username: { stringValue: "john_trader" },
      firstName: { stringValue: "John" },
      role: { stringValue: "CLIENT" },
      tradingBalance: { doubleValue: 0.00 },
      referralBalance: { doubleValue: 0.00 },
      referralCode: { stringValue: `SPARTAN_${telegramId}` },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  };

  console.log("🔥 TESTING FIRESTORE REST API POST:", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(firestoreDocument)
    });

    const data = await res.json();
    if (res.ok) {
      console.log("✅ FIRESTORE REST SUCCESSFUL! RESPONSE:", data.name);
    } else {
      console.error("❌ FIRESTORE REST ERROR:", data);
    }
  } catch (err) {
    console.error("❌ FIRESTORE FETCH EXCEPTION:", err);
  }
}

testFirestoreREST();
