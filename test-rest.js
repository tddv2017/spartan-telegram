async function testFirebaseREST() {
  const telegramId = "494232782";
  const userPayload = {
    telegramId: telegramId,
    username: "john_trader",
    firstName: "John",
    role: "CLIENT",
    tradingBalance: 0.00,
    referralBalance: 0.00,
    referralCode: `SPARTAN_${telegramId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const url = `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/users/${telegramId}.json`;
  console.log("🔥 TESTING HTTP PUT TO FIREBASE REST API:", url);

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload)
    });
    const data = await res.json();
    console.log("✅ HTTP PUT SUCCESSFUL! RESPONSE:", data);
  } catch (err) {
    console.error("❌ HTTP PUT ERROR:", err);
  }
}

testFirebaseREST();
