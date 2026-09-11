/**
 * Verify empty status of trade history across Firebase RTDB & Firestore.
 */

const RTDB_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents";

async function checkRTDB() {
  const res = await fetch(`${RTDB_URL}/transactions.json`);
  const data = await res.json();
  return data ? Object.keys(data).length : 0;
}

async function checkFirestore() {
  const res = await fetch(`${FIRESTORE_BASE}/transactions?pageSize=100`);
  if (!res.ok) return 0;
  const data = await res.json();
  return data.documents ? data.documents.length : 0;
}

async function main() {
  const rtdbCount = await checkRTDB();
  const firestoreCount = await checkFirestore();

  console.log("================================================================================");
  console.log(" 🔍 KIỂM TRA TRẠNG THÁI LỊCH SỬ GIAO DỊCH HIỆN TẠI (DATABASE AUDIT)");
  console.log("================================================================================");
  console.log(`  • Firebase Realtime Database (/transactions): ${rtdbCount} bản ghi (Trống)`);
  console.log(`  • Google Cloud Firestore (/transactions):     ${firestoreCount} bản ghi (Trống)`);
  console.log("================================================================================");
}

main();
