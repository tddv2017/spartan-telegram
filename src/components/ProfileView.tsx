'use client';

import React, { useState } from 'react';
import { User, Share2, Copy, CheckCircle2, ShieldCheck, Users, Trophy, DollarSign, ArrowUpRight } from 'lucide-react';

const mockReferredUsers = [
  { id: 1, name: 'Alex Trader', handle: '@alex_trader', deposit: '$1,000.00', commission: '+$50.00 USDT', status: 'ACTIVE', date: '28/08/2026' },
  { id: 2, name: 'Bình Investor', handle: '@binh_investor', deposit: '$2,000.00', commission: '+$100.00 USDT', status: 'ACTIVE', date: '27/08/2026' },
  { id: 3, name: 'Hoàng Gold', handle: '@hoang_gold', deposit: '$1,500.00', commission: '+$75.00 USDT', status: 'ACTIVE', date: '25/08/2026' },
  { id: 4, name: 'Crypto King', handle: '@crypto_king', deposit: '$3,000.00', commission: '+$150.00 USDT', status: 'ACTIVE', date: '24/08/2026' },
  { id: 5, name: 'Minh Quan', handle: '@minh_quan', deposit: '$800.00', commission: '+$40.00 USDT', status: 'ACTIVE', date: '22/08/2026' },
  { id: 6, name: 'David Smith', handle: '@david_smith', deposit: '$1,000.00', commission: '+$50.00 USDT', status: 'ACTIVE', date: '20/08/2026' },
  { id: 7, name: 'Thành FX', handle: '@thanh_fx', deposit: '$1,200.00', commission: '+$60.00 USDT', status: 'ACTIVE', date: '19/08/2026' },
  { id: 8, name: 'Elena Crypto', handle: '@elena_crypto', deposit: '$2,500.00', commission: '+$125.00 USDT', status: 'ACTIVE', date: '18/08/2026' },
  { id: 9, name: 'Vũ Spartan', handle: '@vu_spartan', deposit: '$1,000.00', commission: '+$50.00 USDT', status: 'ACTIVE', date: '15/08/2026' },
  { id: 10, name: 'Sơn Alpha', handle: '@son_alpha', deposit: '$2,000.00', commission: '+$100.00 USDT', status: 'ACTIVE', date: '12/08/2026' },
];

export const ProfileView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const refLink = 'https://t.me/SpartanQuantAIBot?start=ref_9824029';

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-4 pb-20">
      {/* Profile Header */}
      <div className="spartan-card rounded-3xl p-5 border border-[#1f293d] flex items-center gap-4 shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff5500] to-[#7c3aed] border border-[#facc15] flex items-center justify-center font-black text-white text-xl shadow-[0_4px_14px_rgba(255,85,0,0.4)]">
          SP
        </div>
        <div>
          <h2 className="text-base font-black text-white tracking-tight">Spartan Master Trader</h2>
          <p className="text-xs text-gray-400 font-mono">ID: @spartan_9824029</p>
          <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30">
            👑 MASTER AGENT (LEVEL 3)
          </span>
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
          <span className="text-[10px] font-black text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded-full border border-[#00df89]/30">
            Hoa hồng 5% Trọn Đời
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Chia sẻ liên kết đại lý để mời các nhà đầu tư tham gia hệ thống Spartan AI. Nhận ngay 5% hoa hồng từ phí nạp/rút & lợi nhuận trading!
        </p>

        {/* Copy Referral Link Box */}
        <div className="flex items-center gap-2 bg-[#0b0e17] border border-[#1f293d] p-2.5 rounded-2xl">
          <span className="text-xs text-[#ff5500] font-mono truncate flex-1 font-bold">
            {refLink}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-[#ff5500] text-white font-extrabold text-xs flex items-center gap-1 hover:opacity-90 transition-opacity"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Summary Stats Grid (10 Invites Demo) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d]">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-bold">Tổng Người Giới Thiệu</span>
              <Users className="w-3.5 h-3.5 text-[#ff5500]" />
            </div>
            <span className="text-xl font-black text-white">10 Người</span>
            <span className="text-[9px] text-[#00df89] font-bold block mt-0.5">100% Đang Hoạt Động</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d]">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-bold">Tổng Hoa Hồng Đã Nhận</span>
              <Trophy className="w-3.5 h-3.5 text-[#fbbf24]" />
            </div>
            <span className="text-xl font-black text-[#00df89]">+$800.00</span>
            <span className="text-[9px] text-gray-400 font-bold block mt-0.5">USDT Rút Tự Do</span>
          </div>
        </div>
      </div>

      {/* List of 10 Referred Users (Danh sách 10 Thành Viên Giới Thiệu) */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#ff5500]" /> DANH SÁCH 10 THÀNH VIÊN ĐẠI LÝ
          </h3>
          <span className="text-[10px] text-gray-400 font-bold">10/10 Active</span>
        </div>

        <div className="space-y-2">
          {mockReferredUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#0b0e17] border border-[#1f293d] hover:border-gray-700 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center font-black text-[#ff5500] text-xs">
                  #{user.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white">{user.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{user.handle}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Vốn nạp: <strong className="text-gray-200">{user.deposit}</strong> • {user.date}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-black text-xs text-[#00df89] block">
                  {user.commission}
                </span>
                <span className="text-[9px] font-extrabold text-[#00df89] bg-[#00df89]/10 px-1.5 py-0.5 rounded border border-[#00df89]/30 inline-block mt-0.5">
                  {user.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transparent Fee & Commission Disclosure */}
      <div className="spartan-card rounded-3xl p-4 border border-[#1f293d] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
          <ShieldCheck className="w-4 h-4 text-[#00df89]" />
          <span>Quy Định Trả Hoa Hồng Đại Lý (Affiliate Rules)</span>
        </div>
        <ul className="text-[11px] text-gray-400 space-y-1 list-disc pl-4 leading-relaxed">
          <li>Hoa hồng 5% tự động cộng thẳng vào Ví USDT ngay khi người được giới thiệu nạp tiền hoặc đóng lệnh chốt lời.</li>
          <li>Rút tiền hoa hồng không giới hạn 24/7 qua cổng USDT TRC20/BEP20.</li>
        </ul>
      </div>
    </div>
  );
};
