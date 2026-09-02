'use client';

import React, { useState } from 'react';
import { Trophy, Crown, Award, Users, DollarSign, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LeaderboardItem {
  rank: number;
  username: string;
  telegramId: string;
  tierName: string;
  volume: number;
  f1Count: number;
  badge: string;
  isCurrentUser?: boolean;
}

interface AffiliateLeaderboardCardProps {
  currentUsername: string;
  currentUserId: string;
  userF1Count: number;
  userVolume: number;
}

export const AffiliateLeaderboardCard: React.FC<AffiliateLeaderboardCardProps> = ({
  currentUsername,
  currentUserId,
  userF1Count,
  userVolume
}) => {
  const { lang } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Top Institutional Spartans Leaderboard Data
  const topLeaders: LeaderboardItem[] = [
    {
      rank: 1,
      username: 'tddv2017',
      telegramId: '494232782',
      tierName: 'Supreme Leader',
      volume: 184500,
      f1Count: 68,
      badge: '👑'
    },
    {
      rank: 2,
      username: 'viet_gold88',
      telegramId: '992817263',
      tierName: 'Emperor Tier 9',
      volume: 96400,
      f1Count: 38,
      badge: '💎'
    },
    {
      rank: 3,
      username: 'alex_investor',
      telegramId: '551293847',
      tierName: 'Commander Tier 8',
      volume: 62800,
      f1Count: 24,
      badge: '🥇'
    },
    {
      rank: 4,
      username: 'crypto_whale_sg',
      telegramId: '883920194',
      tierName: 'Warlord Tier 7',
      volume: 41500,
      f1Count: 16,
      badge: '🥈'
    },
    {
      rank: 5,
      username: 'hanoi_quant',
      telegramId: '334918274',
      tierName: 'Centurion Tier 6',
      volume: 28900,
      f1Count: 11,
      badge: '🥉'
    }
  ];

  return (
    <div className="spartan-card rounded-3xl p-4 border border-[#221c10] bg-[#080b12] space-y-3 shadow-md">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(212,175,55,0.2)]">
            🏆
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>{lang === 'vi' ? 'BẢNG VINH DANH TOP ĐẠI LÝ F1' : 'AFFILIATE LEADERBOARD'}</span>
              <span className="text-[8px] font-black gold-btn-solid text-black px-1.5 py-0.2 rounded uppercase font-mono">
                TOP 5
              </span>
            </h3>
            <span className="text-[10px] text-gray-400 block font-mono">
              {lang === 'vi' ? 'Xếp hạng theo tổng doanh số F1 toàn mạng' : 'Ranked by cumulative network F1 volume'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#f5d77f]" /> : <ChevronDown className="w-4 h-4 text-[#f5d77f]" />}
          </span>
        </div>
      </button>

      {/* Leaderboard Body */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-[#221c10] animate-in fade-in duration-200">
          {topLeaders.map((item) => {
            const isSelf = item.username.toLowerCase() === currentUsername.toLowerCase();
            return (
              <div
                key={item.rank}
                className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                  item.rank === 1
                    ? 'bg-[#0f1422] border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                    : isSelf
                    ? 'bg-[#0a121e] border-emerald-500/50'
                    : 'bg-[#05070c] border-[#221c10]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center text-sm font-black font-mono">
                    {item.badge}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">@{item.username}</span>
                      {isSelf && (
                        <span className="text-[8px] font-black bg-emerald-500 text-black px-1 py-0.2 rounded">
                          {lang === 'vi' ? 'BẠN' : 'YOU'}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-[#f5d77f] font-mono block">
                      {item.tierName} • {item.f1Count} F1
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs font-black text-emerald-400 block">
                    ${item.volume.toLocaleString('en-US')} USDT
                  </span>
                  <span className="text-[9px] text-gray-500 block">DOANH SỐ</span>
                </div>
              </div>
            );
          })}

          {/* User's Own Standing Note */}
          <div className="p-2.5 rounded-xl bg-[#0c0f17] border border-[#221c10] text-[10px] font-mono flex items-center justify-between text-gray-400">
            <span>{lang === 'vi' ? 'Doanh số F1 hiện tại của bạn:' : 'Your current F1 Volume:'}</span>
            <span className="text-white font-bold">${userVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT ({userF1Count} F1)</span>
          </div>
        </div>
      )}
    </div>
  );
};
