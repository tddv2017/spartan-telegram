'use client';

import React, { useState, useEffect } from 'react';
import { User, Share2, Copy, CheckCircle2, ShieldCheck, Users, Trophy, DollarSign, ArrowUpRight, Crown, Swords, Zap, Award } from 'lucide-react';
import { subscribeToReferredUsers } from '@/lib/firebaseService';
import { getUserRankInfo } from './Header';
import { checkIsAdmin } from '@/lib/adminAuth';

interface ProfileViewProps {
  telegramId?: string;
  username?: string;
  referralBalance?: number;
  tradingBalance?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  telegramId = '494232782',
  username = 'tddv2017',
  referralBalance = 0.00,
  tradingBalance = 0.00,
}) => {
  const [copied, setCopied] = useState(false);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);

  const isAdmin = checkIsAdmin(username) || checkIsAdmin(telegramId);
  const rank = getUserRankInfo(isAdmin, username, tradingBalance);

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

  const ranksList = [
    { title: 'SUPREME LEADER', icon: '👑', req: 'Admin / Vốn >$5,000U', style: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { title: 'ELITE WARRIOR', icon: '⚔️', req: 'Vốn >$2,500U hoặc 10 F1', style: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { title: 'SPARTAN COMMANDER', icon: '🛡️', req: 'Vốn >$1,000U hoặc 5 F1', style: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { title: 'VANGUARD TITAN', icon: '⚡', req: 'Vốn >$500U', style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { title: 'SPARTAN RECRUIT', icon: '🔰', req: 'Vốn Mới Tạo (<$500U)', style: 'text-gray-400 bg-gray-800 border-gray-700' },
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

            {/* DYNAMIC LEADER LEVEL BADGE */}
            <span className={`inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${rank.badgeStyle}`}>
              <span>{rank.icon}</span>
              <span>{rank.rankName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC LEADER RANK HIERARCHY TIER SYSTEM CARD */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#facc15]" /> BẢNG PHÂN CẤP ĐẠI LÝ LEADER RANK (SYSTEM TIERS)
          </h3>
          <span className="text-[9px] font-black text-[#facc15] bg-[#facc15]/10 px-2 py-0.5 rounded-full border border-[#facc15]/30">
            Cấp Hiện Tại: {rank.rankName}
          </span>
        </div>

        <div className="space-y-2">
          {ranksList.map((item) => {
            const isCurrent = rank.rankName === item.title;
            return (
              <div
                key={item.title}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-[#131927] border-[#facc15] shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                    : 'bg-[#0b0e17] border-[#1f293d]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider ${item.style.split(' ')[0]}`}>
                        {item.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#facc15] text-black rounded uppercase">
                          Đang Đạt
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Yêu cầu: {item.req}</span>
                  </div>
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
            Hoa Hồng 20%
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
