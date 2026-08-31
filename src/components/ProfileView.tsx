'use client';

import React, { useState, useEffect } from 'react';
import { User, Share2, Copy, CheckCircle2, ShieldCheck, Users, Trophy, DollarSign, ArrowUpRight, Crown, Award, ChevronRight } from 'lucide-react';
import { subscribeToReferredUsers } from '@/lib/firebaseService';
import { getUserRankInfo } from './Header';
import { checkIsAdmin } from '@/lib/adminAuth';

interface ProfileViewProps {
  telegramId?: string;
  username?: string;
  referralBalance?: number;
  resellerTier?: number;
  tradingBalance?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  telegramId = '494232782',
  username = 'tddv2017',
  referralBalance = 0.00,
  resellerTier = 1,
  tradingBalance = 0.00,
}) => {
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);

  const isAdmin = checkIsAdmin(username) || checkIsAdmin(telegramId);
  const rank = getUserRankInfo(isAdmin, username, resellerTier);

  // Realtime subscription for Referred Users under this Reseller's account
  useEffect(() => {
    if (!telegramId) return;
    const unsub = subscribeToReferredUsers(telegramId, (users) => {
      setReferredUsers(users);
    });
    return () => unsub();
  }, [telegramId]);

  const refLink = `https://t.me/SpartanQuantAIBot?start=ref_${telegramId || '494232782'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 10-LEVEL RESELLER SYSTEM SPECIFICATION (Cấp 1 đến Cấp 10 Đại Lý)
  const resellerLevelsList = [
    { level: 1, title: 'LEVEL 1 (CẤP 1)', share: '20% HOA HỒNG PHÍ', req: 'Đại lý Master', badge: 'bg-[#ff5500]/20 text-[#ff5500] border-[#ff5500]/40' },
    { level: 2, title: 'LEVEL 2 (CẤP 2)', share: '18% HOA HỒNG PHÍ', req: 'Đã tuyển 5 F1', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { level: 3, title: 'LEVEL 3 (CẤP 3)', share: '16% HOA HỒNG PHÍ', req: 'Đã tuyển 10 F1', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { level: 4, title: 'LEVEL 4 (CẤP 4)', share: '14% HOA HỒNG PHÍ', req: 'Doanh số $5,000U', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { level: 5, title: 'LEVEL 5 (CẤP 5)', share: '12% HOA HỒNG PHÍ', req: 'Doanh số $10,000U', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { level: 6, title: 'LEVEL 6 (CẤP 6)', share: '10% HOA HỒNG PHÍ', req: 'Doanh số $20,000U', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
    { level: 7, title: 'LEVEL 7 (CẤP 7)', share: '8% HOA HỒNG PHÍ', req: 'Doanh số $35,000U', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    { level: 8, title: 'LEVEL 8 (CẤP 8)', share: '6% HOA HỒNG PHÍ', req: 'Doanh số $50,000U', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    { level: 9, title: 'LEVEL 9 (CẤP 9)', share: '4% HOA HỒNG PHÍ', req: 'Doanh số $75,000U', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    { level: 10, title: 'LEVEL 10 (CẤP 10)', share: '2% HOA HỒNG PHÍ', req: 'Doanh số $100,000U', badge: 'bg-gray-800 text-gray-300 border-gray-700' },
  ];

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Profile Header Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff5500] to-[#7c3aed] border border-[#facc15] flex items-center justify-center font-black text-white text-xl shadow-[0_4px_14px_rgba(255,85,0,0.4)]">
            {username.slice(0, 2).toUpperCase() || 'SP'}
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Tài Khoản @{username}</h2>
            <p className="text-xs text-gray-400 font-mono">Telegram ID: {telegramId}</p>

            {/* DYNAMIC LEVEL BADGE (👑 SUPREME LEADER for Admin / 🎖️ RESELLER LEVEL 1-10 for Resellers) */}
            <span className={`inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${rank.badgeStyle}`}>
              <span>{rank.icon}</span>
              <span>{rank.rankName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 10 RESELLER TIERS SYSTEM SPECIFICATION CARD */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#ff5500]" /> BẢNG 10 CẤP ĐỘ ĐẠI LÝ RESELLER (SYSTEM TIERS)
          </h3>
          <span className="text-[9px] font-black text-[#ff5500] bg-[#ff5500]/10 px-2 py-0.5 rounded-full border border-[#ff5500]/30">
            {isAdmin ? '👑 SUPREME LEADER' : `Cấp Hiện Tại: LEVEL ${resellerTier}`}
          </span>
        </div>

        <div className="space-y-2">
          {resellerLevelsList.map((item) => {
            const isCurrent = !isAdmin && resellerTier === item.level;
            return (
              <div
                key={item.level}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-[#131927] border-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.3)]'
                    : 'bg-[#0b0e17] border-[#1f293d]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-[#ff5500]">🎖️</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider ${item.badge.split(' ')[1]}`}>
                        {item.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#ff5500] text-white rounded uppercase">
                          CẤP HIỆN TẠI
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{item.req}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-black text-[#00df89] block">
                    {item.share}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Program Overview Card */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              CHƯƠNG TRÌNH ĐẠI LÝ (LEGION AFFILIATE)
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-[#00df89] bg-[#00df89]/10 px-2.5 py-0.5 rounded-full border border-[#00df89]/20">
            Hoa Hồng Tới 20%
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">TỔNG THU NHẬP ĐẠI LÝ</span>
            <div className="text-lg font-black text-[#00df89]">
              ${referralBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </div>
          </div>

          <div className="bg-[#0b0e17] p-3 rounded-2xl border border-[#1f293d]">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase block mb-1">TỔNG KHÁCH TRỰC THUỘC</span>
            <div className="text-lg font-black text-white flex items-center gap-1">
              <Users className="w-4 h-4 text-[#ff5500]" />
              <span>{referredUsers.length}</span>
              <span className="text-xs text-gray-500 font-bold">F1</span>
            </div>
          </div>
        </div>

        {/* Exclusive Referral Link Box */}
        <div>
          <label className="text-xs text-gray-400 font-bold block mb-1.5">
            LINK MỜI ĐẠI LÝ ĐỘC QUYỀN (TELEGRAM BOT LINK)
          </label>
          <div className="flex items-center gap-2 bg-[#0b0e17] border border-[#1f293d] p-2.5 rounded-2xl">
            <span className="text-xs text-[#ff5500] font-mono font-bold truncate flex-1">
              {refLink}
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl spartan-orange-btn text-xs font-black flex items-center gap-1 hover:opacity-90 transition-opacity"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Referred Clients Sub-List */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#ff5500]" /> DANH SÁCH KHÁCH HÀNG F1 ({referredUsers.length})
          </h3>
        </div>

        {referredUsers.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-bold bg-[#0b0e17] rounded-2xl">
            Chưa có khách hàng F1 nào tham gia qua link đại lý của bạn.
          </div>
        ) : (
          <div className="space-y-2">
            {referredUsers.map((refUser, idx) => (
              <div
                key={refUser.telegramId || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0b0e17] border border-[#1f293d] text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex items-center justify-center font-black">
                    #{idx + 1}
                  </div>
                  <div>
                    <span className="font-extrabold text-white block">@{refUser.username || 'user'}</span>
                    <span className="text-[10px] text-gray-500 font-mono">ID: {refUser.telegramId}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded border border-[#00df89]/20 block">
                    ĐÃ KẾT NỐI F1
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
