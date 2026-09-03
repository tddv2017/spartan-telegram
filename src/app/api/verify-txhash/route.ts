import { NextResponse } from 'next/server';
import crypto from 'crypto';

const RTDB_BASE_URL = 'https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app';
const MASTER_WALLET = 'TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const SECRET_KEY = process.env.SPARTAN_HMAC_SECRET || 'SPARTAN_QUANT_AI_SECRET_KEY_2026';
const BOT_TOKEN = process.env.BOT_TOKEN || '8897704483:AAFRtOHaF4UdH25pgf_IffQUNpCAy0YFp_Q';

/**
 * Generate HMAC-SHA256 Cryptographic Hash Seal
 */
function generateHashSeal(txHash: string, userId: string, amount: number, timestamp: number): string {
  const rawPayload = `${txHash}|${userId}|${amount.toFixed(2)}|${MASTER_WALLET}|${timestamp}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(rawPayload).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, txHash, userId, username } = body;

    if (!txHash || typeof txHash !== 'string') {
      return NextResponse.json({ 
        success: false, 
        message: 'Vui lòng cung cấp mã TxID (Transaction Hash) từ sàn hoặc ví của bạn!' 
      }, { status: 400 });
    }

    const cleanTxHash = txHash.trim().toLowerCase();

    // 1. KỸ THUẬT MÃ BĂM 1: Kiểm tra định dạng SHA-256 64 ký tự Hex
    if (!/^[a-f0-9]{64}$/.test(cleanTxHash)) {
      return NextResponse.json({
        success: false,
        message: '⛔ MÃ BĂM KHÔNG HỢP LỆ: TxID trên mạng TRON bắt buộc phải là chuỗi mã băm SHA-256 gồm đúng 64 ký tự hex (0-9, a-f)!'
      }, { status: 400 });
    }

    // 2. KỸ THUẬT MÃ BĂM 2: Chống Replay Attack (Mã băm không được tái sử dụng)
    const replayCheckRes = await fetch(`${RTDB_BASE_URL}/used_tx_hashes/${cleanTxHash}.json`);
    if (replayCheckRes.ok) {
      const existing = await replayCheckRes.json();
      if (existing) {
        return NextResponse.json({
          success: false,
          message: `⛔ CẢNH BÁO BẢO MẬT: Mã băm TxID này đã từng được sử dụng để nạp tiền vào lúc ${new Date(existing.approvedAt).toLocaleString('vi-VN')}! Hệ thống đã khóa mã băm này để chống gian lận nạp trùng.`
        }, { status: 400 });
      }
    }

    // 3. TRA CỨU BLOCKCHAIN TRON ON-CHAIN (TronGrid API)
    // Tra cứu danh sách giao dịch USDT gần nhất của Master Wallet
    let matchedTransfer: any = null;
    try {
      const tronGridRes = await fetch(
        `https://api.trongrid.io/v1/accounts/${MASTER_WALLET}/transactions/trc20?only_confirmed=true&limit=50`,
        { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
      );
      if (tronGridRes.ok) {
        const gridData = await tronGridRes.json();
        if (gridData?.data && Array.isArray(gridData.data)) {
          matchedTransfer = gridData.data.find(
            (t: any) => t.transaction_id?.toLowerCase() === cleanTxHash
          );
        }
      }
    } catch (e) {
      console.warn('TronGrid list fetch error:', e);
    }

    // Nếu chưa thấy trong danh sách gần đây, tra cứu chi tiết giao dịch qua RPC
    let verifiedOnChainAmount = 0;
    let fromAddress = 'ON_CHAIN_SENDER';

    if (matchedTransfer) {
      const rawVal = parseFloat(matchedTransfer.value || '0');
      const decimals = matchedTransfer.token_info?.decimals || 6;
      verifiedOnChainAmount = rawVal / Math.pow(10, decimals);
      fromAddress = matchedTransfer.from || 'BINANCE_OR_WALLET';
    } else {
      // Direct RPC query: wallet/gettransactionbyid
      try {
        const rpcRes = await fetch('https://api.trongrid.io/wallet/gettransactionbyid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: cleanTxHash })
        });
        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData && rpcData.ret && rpcData.ret[0]?.contractRet === 'SUCCESS') {
            const contract = rpcData.raw_data?.contract?.[0];
            // Contract parameter data contains recipient and value for TRC20 transfer
            const dataStr = contract?.parameter?.value?.data || '';
            if (dataStr.startsWith('a9059cbb')) { // ERC20/TRC20 transfer(address,uint256) method signature
              const rawAmountHex = dataStr.slice(72);
              const rawVal = parseInt(rawAmountHex, 16);
              if (!isNaN(rawVal) && rawVal > 0) {
                verifiedOnChainAmount = rawVal / 1000000;
              }
            }
          }
        }
      } catch (rpcErr) {
        console.warn('Tron RPC query error:', rpcErr);
      }
    }

    // KHẮC PHỤC LỖ HỔNG BẢO MẬT (CISO BlueGuard AI Directive):
    // Tuyệt đối KHÔNG sử dụng fallback lấy grossAmount từ database khi on-chain chưa xác nhận.
    // Bắt buộc 100% giao dịch phải được TronGrid / Tron RPC xác nhận on-chain thành công.
    if (verifiedOnChainAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: '⚠️ CHƯA KHỚP ON-CHAIN: Giao dịch chưa được xác nhận trên mạng TRON hoặc số tiền không hợp lệ. Nếu bạn vừa chuyển từ sàn Binance/OKX, vui lòng đợi 1-2 phút để mạng TRON hoàn tất block confirmation rồi bấm lại!'
      }, { status: 400 });
    }

    // 4. KỸ THUẬT MÃ BĂM 3: Tạo Con Dấu Bất Biến HMAC-SHA256 Seal
    const timestampNow = Date.now();
    const sha256Signature = generateHashSeal(cleanTxHash, userId, verifiedOnChainAmount, timestampNow);

    // Tính toán phí và số tiền thực nhận (9% + $3.00 USD)
    const grossAmount = verifiedOnChainAmount;
    const feeAmount = Number((grossAmount * 0.09 + 3.00).toFixed(2));
    const netAmount = Number(Math.max(0, grossAmount - feeAmount).toFixed(2));

    // 5. CẬP NHẬT GIAO DỊCH TRONG CƠ SỞ DỮ LIỆU
    const approvedAtIso = new Date().toISOString();
    const updatePayload = {
      status: 'APPROVED',
      grossAmount: grossAmount,
      feeAmount: feeAmount,
      netAmount: netAmount,
      actualOnChainAmount: grossAmount,
      onChainTxHash: cleanTxHash,
      sha256Signature: sha256Signature,
      approvedBy: 'AI_SENTINEL_SHA256_HASH_VALIDATOR',
      approvedAt: approvedAtIso,
      fromAddress: fromAddress
    };

    // Update global transaction
    if (orderId) {
      await fetch(`${RTDB_BASE_URL}/transactions/${orderId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      // Update user transaction copy
      await fetch(`${RTDB_BASE_URL}/users/${userId}/transactions/${orderId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
    }

    // 6. CỘNG TIỀN VÀO TÀI KHOẢN NGƯỜI DÙNG & GHI NHẬN MỐC THỜI GIAN VÀO VỐN
    const userRes = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`);
    let newTradingBalance = netAmount;
    if (userRes.ok) {
      const userData = await userRes.json();
      if (userData) {
        const currentBal = Number(userData.tradingBalance) || 0;
        newTradingBalance = Number((currentBal + netAmount).toFixed(2));
        
        await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradingBalance: newTradingBalance,
            capitalJoinedAt: userData.capitalJoinedAt || approvedAtIso,
            updatedAt: approvedAtIso
          })
        });
      }
    }

    // 7. GHI MÃ BĂM VÀO BẢNG CHỐNG REPLAY
    await fetch(`${RTDB_BASE_URL}/used_tx_hashes/${cleanTxHash}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        username: username || '',
        grossAmount: grossAmount,
        netAmount: netAmount,
        sha256Signature: sha256Signature,
        approvedAt: approvedAtIso
      })
    });

    // 8. BẮN THÔNG BÁO TELEGRAM CHO KHÁCH HÀNG
    try {
      const msgText = 
        `🎉 *[SPARTAN XÁC THỰC MÃ BĂM TXID THÀNH CÔNG]*\n\n` +
        `Đơn nạp *#${orderId || 'DEP'}* đã được hệ thống AI Sentinel xác thực mã băm On-Chain và duyệt tự động!\n\n` +
        `⛓ *Mã băm SHA-256 On-Chain (TxID):*\n\`${cleanTxHash}\`\n\n` +
        `💵 *Số tiền nạp gốc (Gross):* $${grossAmount.toFixed(2)} USDT\n` +
        `📉 *Phí nạp & mạng (9% + $3):* -$${feeAmount.toFixed(2)} USDT\n` +
        `🟢 *✓ Thực nhận cộng vốn:* *+$${netAmount.toFixed(2)} USDT*\n` +
        `📊 *Tổng Vốn Bot khả dụng:* *$${newTradingBalance.toFixed(2)} USDT*\n` +
        `🛡 *Chữ ký bảo mật HMAC-SHA256:* \`${sha256Signature.slice(0, 16)}...\`\n\n` +
        `Vốn của bạn đã chính thức tham gia Master Pool sinh lời cùng Spartan Quant 300 AI! 🚀`;

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          text: msgText,
          parse_mode: 'Markdown'
        })
      }).catch(() => {});
    } catch (notifErr) {}

    return NextResponse.json({
      success: true,
      message: `🎉 XÁC THỰC MÃ BĂM THÀNH CÔNG! Đã khớp on-chain $${grossAmount.toFixed(2)} USDT và tự động cộng +$${netAmount.toFixed(2)} USDT vào vốn của bạn!`,
      txHash: cleanTxHash,
      grossAmount: grossAmount,
      netAmount: netAmount,
      newTradingBalance: newTradingBalance,
      sha256Signature: sha256Signature
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: 'Lỗi máy chủ xác thực mã băm: ' + err.message
    }, { status: 500 });
  }
}
