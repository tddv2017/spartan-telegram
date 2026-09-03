/**
 * SPARTAN NOTIFICATION SERVICE
 * Manages system broadcasts, transaction alerts, affiliate rebates, and security notifications.
 */

import { TransactionData } from './firebaseService';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'BROADCAST' | 'BOT' | 'AFFILIATE' | 'SECURITY';
  isRead: boolean;
  timestamp: string;
  actionUrl?: string;
  actionText?: string;
}

const STORAGE_KEY_PREFIX = 'spartan_notifications_read_';

/**
 * Generate notifications dynamically from user transactions, broadcast messages, and bot signals
 */
export function generateUserNotifications(
  telegramId: string,
  username: string,
  transactions: TransactionData[],
  broadcastNotice?: string,
  tradingBalance: number = 0,
  referralBalance: number = 0
): AppNotification[] {
  const readIds: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${telegramId}`);
      if (stored) {
        readIds.push(...JSON.parse(stored));
      }
    } catch {}
  }

  const notifications: AppNotification[] = [];

  // 1. Broadcast Notifications
  if (broadcastNotice && broadcastNotice.trim()) {
    const bId = `broadcast_${broadcastNotice.slice(0, 15).replace(/\s+/g, '_')}`;
    notifications.push({
      id: bId,
      title: '📢 THÔNG BÁO QUAN TRỌNG TỪ TỔNG CHỈ HUY',
      message: broadcastNotice,
      type: 'BROADCAST',
      isRead: readIds.includes(bId),
      timestamp: new Date().toISOString(),
      actionText: 'Xem Chi Tiết'
    });
  }

  // 2. Transaction Status Notifications
  transactions.forEach((tx) => {
    const txId = tx.id || tx.memoCode;
    if (!txId) return;

    if (tx.type === 'DEPOSIT') {
      if (tx.status === 'APPROVED') {
        const notifId = `deposit_approved_${txId}`;
        notifications.push({
          id: notifId,
          title: '🎉 NẠP TIỀN THÀNH CÔNG',
          message: `Đơn nạp #${txId} ($${tx.grossAmount?.toFixed(2)} USDT) đã được duyệt! Đã cộng chính xác +$${tx.netAmount?.toFixed(2)} USDT vào vốn Bot của bạn.`,
          type: 'DEPOSIT',
          isRead: readIds.includes(notifId),
          timestamp: tx.createdAt || new Date().toISOString()
        });
      } else if (tx.status === 'REJECTED') {
        const notifId = `deposit_rejected_${txId}`;
        notifications.push({
          id: notifId,
          title: '❌ ĐƠN NẠP BỊ TỪ CHỐI BỞI QUẢN TRỊ VIÊN',
          message: `Đơn nạp #${txId} ($${tx.grossAmount?.toFixed(2)} USDT) bị từ chối do nhập sai Memo hoặc số tiền chưa khớp. Vui lòng liên hệ Kỹ thuật / Hỗ trợ @tddv2017 để được kiểm tra.`,
          type: 'DEPOSIT',
          isRead: readIds.includes(notifId),
          timestamp: tx.createdAt || new Date().toISOString(),
          actionUrl: 'https://t.me/tddv2017',
          actionText: 'Liên Hệ Hỗ Trợ @tddv2017'
        });
      } else if (tx.status === 'PENDING') {
        const notifId = `deposit_pending_${txId}`;
        notifications.push({
          id: notifId,
          title: '⏳ ĐƠN NẠP ĐANG CHỜ XỬ LÝ',
          message: `Đơn nạp #${txId} ($${tx.grossAmount?.toFixed(2)} USDT) đang được hệ thống quét Blockchain TRON hoặc Quản trị viên đối soát.`,
          type: 'DEPOSIT',
          isRead: readIds.includes(notifId),
          timestamp: tx.createdAt || new Date().toISOString()
        });
      }
    } else if (tx.type === 'WITHDRAW') {
      if (tx.status === 'APPROVED') {
        const notifId = `withdraw_approved_${txId}`;
        notifications.push({
          id: notifId,
          title: '💸 RÚT TIỀN THÀNH CÔNG',
          message: `Đơn rút #${txId} ($${tx.grossAmount?.toFixed(2)} USDT) đã được chuyển về ví cá nhân của bạn (Net nhận: +$${tx.netAmount?.toFixed(2)} USDT sau khi trừ phí).`,
          type: 'WITHDRAW',
          isRead: readIds.includes(notifId),
          timestamp: tx.createdAt || new Date().toISOString()
        });
      } else if (tx.status === 'REJECTED') {
        const notifId = `withdraw_rejected_${txId}`;
        notifications.push({
          id: notifId,
          title: '🚫 ĐƠN RÚT TIỀN BỊ TỪ CHỐI',
          message: `Yêu cầu rút #${txId} ($${tx.grossAmount?.toFixed(2)} USDT) bị từ chối. Vui lòng kiểm tra lại địa chỉ ví hoặc liên hệ Quản trị viên.`,
          type: 'WITHDRAW',
          isRead: readIds.includes(notifId),
          timestamp: tx.createdAt || new Date().toISOString(),
          actionUrl: 'https://t.me/tddv2017',
          actionText: 'Liên Hệ Hỗ Trợ'
        });
      }
    }
  });

  // 3. Welcome / System Setup Notification
  const welcomeId = `welcome_${telegramId}`;
  notifications.push({
    id: welcomeId,
    title: '🛡️ CHÀO MỪNG ĐẾN VỚI SPARTAN TRADING SYSTEM',
    message: `Tài khoản @${username || 'user'} (ID: ${telegramId}) đã kết nối thành công với Hệ thống Robot Quant AI Exness ECN.`,
    type: 'BOT',
    isRead: readIds.includes(welcomeId),
    timestamp: new Date(Date.now() - 86400000).toISOString()
  });

  // 4. Referral / Bot Yield notification if balances exist
  if (referralBalance > 0) {
    const refId = `ref_rebate_${telegramId}_${Math.floor(referralBalance)}`;
    notifications.push({
      id: refId,
      title: '🎁 CHIẾT KHẤU ĐỐI TÁC F1 ĐÃ GHI NHẬN',
      message: `Bạn đang có $${referralBalance.toFixed(2)} USDT chiết khấu đối tác khả dụng sẵn sàng kết chuyển hoặc tái phân bổ.`,
      type: 'AFFILIATE',
      isRead: readIds.includes(refId),
      timestamp: new Date().toISOString()
    });
  }

  return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Mark a notification as read in LocalStorage
 */
export function markNotificationAsRead(telegramId: string, notifId: string) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${telegramId}`;
    const stored = localStorage.getItem(key);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    if (!ids.includes(notifId)) {
      ids.push(notifId);
      localStorage.setItem(key, JSON.stringify(ids));
    }
  } catch {}
}

/**
 * Mark all notifications as read in LocalStorage
 */
export function markAllNotificationsAsRead(telegramId: string, notifIds: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${telegramId}`;
    localStorage.setItem(key, JSON.stringify(notifIds));
  } catch {}
}
