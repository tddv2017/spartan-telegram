import { approveLiveTransaction, rejectLiveTransaction, TransactionData } from "./firebaseService";

/**
 * TRON / TRONGRID / TRONSCAN REALTIME BLOCKCHAIN INTEGRATION SERVICE
 * Master Wallet USDT TRC20: TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu
 * Official USDT TRC20 Contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
 */

export interface TronTRC20Transfer {
  transaction_id: string;
  from: string;
  to: string;
  value: string;
  amount: number; // In USDT (decimals = 6)
  token_info: {
    symbol: string;
    address: string;
    decimals: number;
  };
  block_timestamp: number;
  memo?: string;
}

const MASTER_WALLET = 'TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";

/**
 * Fetch recent incoming USDT TRC20 transactions from TronGrid API
 */
export async function fetchTronGridTRC20Transfers(): Promise<TronTRC20Transfer[]> {
  try {
    const url = `https://api.trongrid.io/v1/accounts/${MASTER_WALLET}/transactions/trc20?only_confirmed=true&limit=20`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 5 }
    });

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        const transfers: TronTRC20Transfer[] = json.data
          .filter((tx: any) => tx.to === MASTER_WALLET && (tx.token_info?.symbol === 'USDT' || tx.token_info?.address === USDT_CONTRACT))
          .map((tx: any) => {
            const rawVal = parseFloat(tx.value || '0');
            const decimals = tx.token_info?.decimals || 6;
            const amountUsdt = rawVal / Math.pow(10, decimals);
            return {
              transaction_id: tx.transaction_id,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              amount: amountUsdt,
              token_info: tx.token_info,
              block_timestamp: tx.block_timestamp
            };
          });

        return transfers;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [TRONGRID API NOTICE] Chuyển hướng sang TronScan API Backup...`, err);
  }

  // Backup: TronScan API
  return await fetchTronScanTRC20Transfers();
}

/**
 * Backup API: Fetch incoming USDT TRC20 transactions from TronScan API
 */
export async function fetchTronScanTRC20Transfers(): Promise<TronTRC20Transfer[]> {
  try {
    const url = `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=20&start=0&toAddress=${MASTER_WALLET}&tokenAddress=${USDT_CONTRACT}`;

    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.token_transfers)) {
        const transfers: TronTRC20Transfer[] = json.token_transfers.map((tx: any) => {
          const rawVal = parseFloat(tx.quant || '0');
          const decimals = tx.decimals || 6;
          const amountUsdt = rawVal / Math.pow(10, decimals);
          return {
            transaction_id: tx.transaction_id || tx.hash,
            from: tx.from_address,
            to: tx.to_address,
            value: tx.quant,
            amount: amountUsdt,
            token_info: {
              symbol: tx.tokenInfo?.tokenSymbol || 'USDT',
              address: tx.tokenInfo?.tokenId || USDT_CONTRACT,
              decimals: decimals
            },
            block_timestamp: tx.block_ts
          };
        });
        return transfers;
      }
    }
  } catch (err) {
    console.error('TronScan fetch error:', err);
  }

  return [];
}

/**
 * Verify On-Chain Transaction against Pending Order
 */
export async function scanAndVerifyOnChainDeposit(memoCode: string, expectedGross?: number): Promise<{
  found: boolean;
  actualAmount?: number;
  txHash?: string;
  fromAddress?: string;
  timestamp?: number;
}> {
  const transfers = await fetchTronGridTRC20Transfers();
  
  if (transfers.length === 0) {
    return { found: false };
  }

  // Look for transfer matching memo code or timestamp criteria
  const matched = transfers.find(t => t.memo === memoCode || t.transaction_id.includes(memoCode));

  if (matched) {
    return {
      found: true,
      actualAmount: matched.amount,
      txHash: matched.transaction_id,
      fromAddress: matched.from,
      timestamp: matched.block_timestamp
    };
  }

  // Fallback: If no exact memo text matching is embedded, return latest transfer matching expected amount if within last 10 minutes
  if (expectedGross && expectedGross > 0) {
    const latestMatch = transfers.find(t => {
      const timeDiff = Date.now() - t.block_timestamp;
      return Math.abs(t.amount - expectedGross) < 0.01 && timeDiff < 600000; // 10 mins
    });

    if (latestMatch) {
      return {
        found: true,
        actualAmount: latestMatch.amount,
        txHash: latestMatch.transaction_id,
        fromAddress: latestMatch.from,
        timestamp: latestMatch.block_timestamp
      };
    }
  }

  return { found: false };
}

/**
 * BACKGROUND AUTO-SCANNER WORKER (Bot tự động quét TronScan/TronGrid & Phê duyệt / Từ chối thông minh khi sai Memo)
 */
export function startAutoScanWorker(
  onTxApproved?: (tx: TransactionData, actualAmount: number) => void,
  onTxRejected?: (tx: TransactionData, reason: string) => void
) {
  console.log(`🚀 [BOT AUTO-SCANNER WORKER] Đã kích hoạt Bot tự động quét TronGrid & TronScan (Tần suất: 8 giây/lần)...`);

  const intervalId = setInterval(async () => {
    try {
      // 1. Fetch pending deposit transactions from Firebase
      const res = await fetch(`${RTDB_BASE_URL}/transactions.json`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data) return;

      const pendingDeposits = Object.values(data).filter(
        (t: any) => t.type === 'DEPOSIT' && t.status === 'PENDING'
      ) as TransactionData[];

      if (pendingDeposits.length === 0) return;

      // 2. Fetch recent TRON TRC20 transfers
      const transfers = await fetchTronGridTRC20Transfers();
      if (transfers.length === 0) return;

      // 3. Match pending deposits against TRON transfers
      for (const tx of pendingDeposits) {
        if (!tx.id || !tx.memoCode) continue;

        // Check if any transfer matches memoCode exactly OR exact amount
        const exactMatch = transfers.find(tr => 
          (tr.memo && tr.memo === tx.memoCode) ||
          tr.transaction_id.includes(tx.memoCode)
        );

        if (exactMatch) {
          console.log(`🎉 [BOT AUTO-SCANNER SUCCESS] Khớp chính xác Memo On-Chain ${exactMatch.transaction_id} cho đơn nạp ${tx.id}!`);
          const result = await approveLiveTransaction(tx.id, 'BOT_TRONGRID_AUTOMATION', exactMatch.amount);
          if (result.success && onTxApproved) {
            onTxApproved(tx, exactMatch.amount);
          }
          continue;
        }

        // Check if a transfer arrived with matching amount but mismatched memo
        const mismatchedTransfer = transfers.find(tr => 
          Math.abs(tr.amount - tx.grossAmount) < 0.01 && 
          tr.memo && 
          tr.memo !== tx.memoCode
        );

        if (mismatchedTransfer) {
          const rejectReason = `Tự động từ chối bởi AI Sentinel: Phát hiện giao dịch on-chain $${mismatchedTransfer.amount.toFixed(2)} USDT nhưng sai Memo (Nội dung nhận được: "${mismatchedTransfer.memo}" - Memo yêu cầu: "${tx.memoCode}"). Vui lòng gửi ảnh bill để AI đối soát lại.`;
          console.log(`⚠️ [BOT AUTO-SCANNER MISMATCH] Đơn ${tx.id} sai Memo! AI tự động từ chối và yêu cầu gửi bill...`);
          
          const rejectRes = await rejectLiveTransaction(tx.id, 'SPARTAN_AI_SENTINEL', rejectReason);
          if (rejectRes.success && onTxRejected) {
            onTxRejected(tx, rejectReason);
          }
        }
      }
    } catch (err) {
      console.warn('AutoScan worker loop notice:', err);
    }
  }, 8000); // Poll every 8 seconds

  return () => clearInterval(intervalId);
}
