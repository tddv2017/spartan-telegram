/**
 * Clean & Delete Trade History from Google Cloud Firestore REST API.
 * Project ID: decisive-mapper-216306
 *
 * Clears:
 * 1. Root `transactions` collection
 * 2. Root `trade_history` collection
 * 3. Root `trades` collection
 * 4. Subcollection `users/{userId}/transactions`
 * 5. Subcollection `users/{userId}/trade_history`
 */

const PROJECT_ID = "decisive-mapper-216306";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fetchDocuments(collectionPath) {
  try {
    const url = `${FIRESTORE_BASE}/${collectionPath}?pageSize=300`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (err) {
    return [];
  }
}

async function deleteDocument(documentName) {
  try {
    const url = `https://firestore.googleapis.com/v1/${documentName}`;
    const res = await fetch(url, { method: "DELETE" });
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log("================================================================================");
  console.log(" 🧹 TIẾN HÀNH XÓA LỊCH SỬ GIAO DỊCH TRÊN GOOGLE FIRESTORE");
  printBanner("Project ID: " + PROJECT_ID);

  const rootCollections = ["transactions", "trade_history", "trades", "recent_trades", "ea_telemetry"];

  for (const col of rootCollections) {
    const docs = await fetchDocuments(col);
    let count = 0;
    for (const doc of docs) {
      const ok = await deleteDocument(doc.name);
      if (ok) count++;
    }
    console.log(`✔ Đã xóa ${count}/${docs.length} tài liệu trong Firestore collection \`/${col}\``);
  }

  // Clear subcollections under users
  const userDocs = await fetchDocuments("users");
  let userSubDocsDeleted = 0;
  for (const userDoc of userDocs) {
    const parts = userDoc.name.split('/');
    const userId = parts[parts.length - 1];

    for (const subCol of ["transactions", "trade_history", "trades"]) {
      const subDocs = await fetchDocuments(`users/${userId}/${subCol}`);
      for (const subDoc of subDocs) {
        const ok = await deleteDocument(subDoc.name);
        if (ok) userSubDocsDeleted++;
      }
    }
  }

  console.log(`✔ Đã làm sạch ${userSubDocsDeleted} giao dịch trong các subcollections của người dùng.`);
  console.log("\n================================================================================");
  console.log(" ✅ ĐÃ XÓA TOÀN BỘ LỊCH SỬ GIAO DỊCH TRÊN FIRESTORE THÀNH CÔNG!");
  console.log("================================================================================");
}

function printBanner(msg) {
  console.log("🔥 " + msg + "\n");
}

main();
