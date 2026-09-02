'use client';

import React, { useState } from 'react';
import { TransactionData } from '@/lib/firebaseService';
import { UserAuditItem } from '@/lib/adminService';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Database, 
  Activity, 
  DollarSign, 
  Users, 
  Receipt,
  Loader2,
  GitFork,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';

interface AdminOverviewTabProps {
  pendingTxs: TransactionData[];
  transactions: TransactionData[];
  users: UserAuditItem[];
  loadingMap: Record<string, boolean>;
  onApprove: (tx: TransactionData) => void;
  onReject: (tx: TransactionData) => void;
  broadcastMsg: string;
  setBroadcastMsg: (val: string) => void;
  onBroadcast: () => void;
}

import { useLanguage } from '@/contexts/LanguageContext';

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  pendingTxs,
  transactions,
  users,
  loadingMap,
  onApprove,
  onReject,
  broadcastMsg,
  setBroadcastMsg,
  onBroadcast,
}) => {
  const { t, lang } = useLanguage();
  const [showOrgTree, setShowOrgTree] = useState(true);

  // Aggregate Key Metrics
  const totalTVL = users.reduce((sum, u) => sum + (u.tradingBalance || 0), 0);
  const totalApprovedDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'APPROVED').length;

  return (
    <div className="space-y-4">
      {/* KPI Top Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#080b12] p-3.5 rounded-2xl border border-[#221c10] space-y-1 shadow-md">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
            {t('admin_tvl')}
          </span>
          <div className="text-lg font-black text-emerald-400 font-mono">
            ${totalTVL.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
          </div>
          <span className="text-[9px] text-gray-500 font-mono block">
            {lang === 'vi' ? `Từ ${users.length} tài khoản thành viên` : `From ${users.length} member accounts`}
          </span>
        </div>

        <div className="bg-[#080b12] p-3.5 rounded-2xl border border-[#221c10] space-y-1 shadow-md">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
            {t('admin_pending_queue')}
          </span>
          <div className="text-lg font-black text-[#f5d77f] font-mono">
            {pendingTxs.length} {lang === 'vi' ? 'Lệnh Chờ' : 'Pending Orders'}
          </div>
          <span className="text-[9px] text-gray-500 font-mono block">
            {totalApprovedDeposits} {lang === 'vi' ? 'lệnh nạp đã hoàn tất on-chain' : 'deposits completed on-chain'}
          </span>
        </div>
      </div>

      {/* SƠ ĐỒ CƠ CẤU TỔ CHỨC ĐƠN VỊ HÀNH CHÍNH (ORGANIZATION HIERARCHY TREE) */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-[#f5d77f]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {t('admin_org_tree_title')}
            </h3>
          </div>
          <button
            onClick={() => setShowOrgTree(!showOrgTree)}
            className="text-[10px] font-bold text-[#f5d77f] flex items-center gap-1 hover:opacity-80 active:scale-95"
          >
            <span>{showOrgTree ? t('admin_org_tree_collapse') : t('admin_org_tree_expand')}</span>
            {showOrgTree ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showOrgTree && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-300">
            {/* Top Node: Supreme Leader */}
            <div className="bg-gradient-to-r from-[#d4af37]/15 via-[#0c0f17] to-[#d4af37]/15 border-2 border-[#d4af37]/60 rounded-2xl p-3.5 text-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">👑</span>
                <div>
                  <span className="text-[10px] font-black text-[#f5d77f] uppercase tracking-wider block">
                    {t('admin_supreme_board')}
                  </span>
                  <span className="text-sm font-black text-white">
                    @tddv2017 (ID: 494232782)
                  </span>
                </div>
              </div>
            </div>

            {/* Tree Branch Connector */}
            <div className="flex flex-col items-center -my-2">
              <div className="w-0.5 h-4 bg-[#d4af37]/60"></div>
              <div className="w-4/5 h-0.5 bg-[#221c10]"></div>
            </div>

            {/* 3 Department Sub-Branches */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              {/* Branch 1: Accounting */}
              <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💰</span>
                  <span className="text-[11px] font-black text-[#f5d77f] uppercase">
                    1. {lang === 'vi' ? 'KẾ TOÁN & KIỂM TOÁN' : 'ACCOUNTING & AUDIT'}
                  </span>
                </div>
                <ul className="text-[10px] text-gray-400 space-y-1 font-medium pl-1">
                  <li>• {lang === 'vi' ? 'Đối soát Hóa đơn Nạp / Rút 3 chiều' : '3-way Deposit / Withdrawal Audit'}</li>
                  <li>• {lang === 'vi' ? 'Tính phí Nạp (9%+3$) & Rút (19%+5$)' : 'Fee: Deposit (9%+3$) & Withdraw (19%+5$)'}</li>
                  <li>• {lang === 'vi' ? 'Trích giữ 10% Quỹ Dự phòng Treasury' : '10% Treasury Retention Reserve'}</li>
                  <li>• {lang === 'vi' ? 'Báo cáo Chi trả Hoa hồng F1 Reseller' : 'F1 Reseller Rebate Payout'}</li>
                </ul>
              </div>

              {/* Branch 2: HR & Reseller */}
              <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👥</span>
                  <span className="text-[11px] font-black text-[#f5d77f] uppercase">
                    2. {lang === 'vi' ? 'NHÂN SỰ & ĐẠI LÝ F1' : 'PERSONNEL & F1 RESELLERS'}
                  </span>
                </div>
                <ul className="text-[10px] text-gray-400 space-y-1 font-medium pl-1">
                  <li>• {lang === 'vi' ? 'Danh bạ Quản lý Toàn bộ Thành viên' : 'Member Directory & Profiles'}</li>
                  <li>• {lang === 'vi' ? 'Quản trị Ma trận 10 Cấp bậc Đại lý' : '10-Tier Reseller Matrix Oversight'}</li>
                  <li>• {lang === 'vi' ? 'Phân quyền Vai trò & Khóa Tài khoản' : 'Role Permissions & Account Locks'}</li>
                  <li>• {lang === 'vi' ? 'Cây Phả hệ Tuyến Dưới (Downlines)' : 'Downline Affiliate Tree'}</li>
                </ul>
              </div>

              {/* Branch 3: TechOps */}
              <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚡</span>
                  <span className="text-[11px] font-black text-emerald-400 uppercase">
                    3. {lang === 'vi' ? 'KỸ THUẬT & TÁC CHIẾN' : 'TECHOPS & INFRASTRUCTURE'}
                  </span>
                </div>
                <ul className="text-[10px] text-gray-400 space-y-1 font-medium pl-1">
                  <li>• {lang === 'vi' ? 'Bật / Tắt Chế độ Bảo trì Hệ thống' : 'Toggle System Maintenance Mode'}</li>
                  <li>• {lang === 'vi' ? 'Ngắt Bot Tổng Khẩn cấp (Kill-Switch)' : 'Global Emergency Kill-Switch'}</li>
                  <li>• {lang === 'vi' ? 'Tắt / Bật Bot Từng Cá nhân Riêng lẻ' : 'Per-User Individual Bot Control'}</li>
                  <li>• {lang === 'vi' ? 'Giám sát Exness MT5 EA & TronGrid' : 'Exness MT5 EA & TronGrid Watch'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Transactions Realtime Approval Queue */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#221c10] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#f5d77f]" /> {lang === 'vi' ? `HÀNG ĐỢI DUYỆT GIAO DỊCH (${pendingTxs.length})` : `TRANSACTION APPROVAL QUEUE (${pendingTxs.length})`}
          </h3>
          <span className="text-[10px] text-gray-400 font-mono font-bold">
            {lang === 'vi' ? 'Tự động đồng bộ Realtime' : 'Realtime Auto-Sync'}
          </span>
        </div>

        {pendingTxs.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-bold bg-[#05070c] rounded-2xl border border-[#221c10]">
            {lang === 'vi' ? 'Hiện không có lệnh nào đang chờ xử lý' : 'No pending transactions awaiting approval'}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTxs.map((tx) => {
              const key = tx.id || tx.memoCode;
              const isProcessing = loadingMap[key] || false;
              return (
                <div
                  key={key}
                  className="p-3.5 rounded-2xl bg-[#05070c] border border-[#221c10] space-y-2.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tx.type === 'DEPOSIT' ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          {lang === 'vi' ? 'NẠP TIỀN' : 'DEPOSIT'}
                        </span>
                      ) : (tx.id?.includes('REF') || tx.memoCode?.includes('REF')) ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-[#d4af37]/15 text-[#f5d77f] border-[#d4af37]/35">
                          {lang === 'vi' ? 'RÚT HOA HỒNG (0% PHÍ)' : 'WITHDRAW REBATE (0% FEE)'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30">
                          {lang === 'vi' ? 'RÚT VỐN BOT' : 'WITHDRAW CAPITAL'}
                        </span>
                      )}
                      <span className="font-extrabold text-white">@{tx.username}</span>
                      <span className="text-[10px] text-gray-500">(ID: {tx.userId})</span>
                    </div>
                    <span className="font-black text-[#f5d77f] text-[10px] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/30">
                      {lang === 'vi' ? 'CHỜ DUYỆT' : 'PENDING'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#080b12] p-2.5 rounded-xl border border-[#221c10]">
                    <div>
                      <span className="text-gray-400 block text-[9px]">{lang === 'vi' ? 'SỐ TIỀN YÊU CẦU:' : 'GROSS AMOUNT:'}</span>
                      <span className="font-black text-white font-mono">${tx.grossAmount.toFixed(2)} USD</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px]">{lang === 'vi' ? 'THỰC NHẬN (NET):' : 'NET PAYOUT:'}</span>
                      <span className="font-black text-emerald-400 font-mono">${tx.netAmount.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Memo: <strong className="text-[#f5d77f]">{tx.memoCode}</strong></span>
                    <span>Order: {tx.id}</span>
                  </div>

                  {/* Action Buttons: Approve vs Reject */}
                  <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                    <button
                      onClick={() => onApprove(tx)}
                      disabled={isProcessing}
                      className="py-2 rounded-xl gold-btn-solid text-black font-black text-xs uppercase flex items-center justify-center gap-1 hover:opacity-95 transition-opacity active:scale-95"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                      <span>{lang === 'vi' ? 'DUYỆT LỆNH' : 'APPROVE'}</span>
                    </button>

                    <button
                      onClick={() => onReject(tx)}
                      disabled={isProcessing}
                      className="py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-red-400 font-black text-xs uppercase flex items-center justify-center gap-1 transition-opacity active:scale-95"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{lang === 'vi' ? 'TỪ CHỐI' : 'REJECT'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Emergency Broadcast Dispatcher */}
      <div className="spartan-card rounded-3xl p-5 border border-[#221c10] bg-[#080b12] space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-[#221c10] pb-2.5">
          <Send className="w-4 h-4 text-[#f5d77f]" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            {lang === 'vi' ? 'BỘ PHÁT THÔNG BÁO TOÀN HỆ THỐNG' : 'GLOBAL BROADCAST DISPATCHER'}
          </h3>
        </div>

        <div>
          <textarea
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            rows={3}
            className="w-full bg-[#05070c] border border-[#221c10] rounded-2xl p-3 text-white text-xs font-medium focus:outline-none focus:border-[#d4af37]"
            placeholder={lang === 'vi' ? 'Nhập nội dung thông điệp để phát trực tiếp tới tất cả người dùng Telegram Mini App...' : 'Enter message to broadcast directly to all Telegram Mini App users...'}
          />
        </div>

        <button
          onClick={onBroadcast}
          className="w-full py-3 rounded-2xl spartan-cta-btn font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Send className="w-4 h-4" />
          <span>{lang === 'vi' ? 'PHÁT THÔNG BÁO TỨC THÌ' : 'BROADCAST MESSAGE NOW'}</span>
        </button>
      </div>
    </div>
  );
};
