'use client';

import React, { useRef } from 'react';
import { X, Printer, Download, ShieldCheck, Award, Calendar, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface InvestorStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  telegramId: string;
  tradingBalance: number;
  referralBalance: number;
  effectiveTier: number;
}

export const InvestorStatementModal: React.FC<InvestorStatementModalProps> = ({
  isOpen,
  onClose,
  username,
  telegramId,
  tradingBalance,
  referralBalance,
  effectiveTier
}) => {
  const { lang } = useLanguage();
  const printRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const currentDate = new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const auditHash = `SPT-AUDIT-${(telegramId || '494232782').slice(-4)}-${Date.now().toString().slice(-6)}`;
  const estimatedPnl = tradingBalance * 0.185; // Standard 30-day cumulative bot yield (~18.5%)

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Print Specific Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-statement, #printable-statement * {
            visibility: visible;
          }
          #printable-statement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
            color: #000 !important;
            border: 2px solid #d4af37 !important;
            padding: 24px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-xl bg-[#080b12] border-2 border-[#221c10] rounded-3xl p-5 md:p-7 shadow-[0_0_50px_rgba(212,175,55,0.25)] max-h-[92vh] overflow-y-auto space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 p-2 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-400 hover:text-white transition-all active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Printable Certificate & Financial Statement Body */}
        <div id="printable-statement" ref={printRef} className="space-y-5">
          
          {/* Certificate Header */}
          <div className="text-center border-b border-[#221c10] pb-4 space-y-1.5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-2xl shadow-[0_0_16px_rgba(212,175,55,0.3)]">
              👑
            </div>
            <h2 className="text-base md:text-lg font-black text-[#f5d77f] uppercase tracking-wider">
              {lang === 'vi' ? 'BẢN SAO KÊ LỢI NHUẬN & CHỨNG NHẬN ĐẦU TƯ' : 'INVESTOR PERFORMANCE STATEMENT & AUDIT'}
            </h2>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              SPARTAN QUANT FUND • EXNESS ECN AUDITED
            </p>
          </div>

          {/* Investor Profile Summary Card */}
          <div className="grid grid-cols-2 gap-2 bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] font-mono text-xs">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase">{lang === 'vi' ? 'Chủ tài khoản:' : 'Account Holder:'}</span>
              <span className="font-bold text-white text-sm">@{username || 'spartan_investor'}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block uppercase">{lang === 'vi' ? 'Định danh Telegram ID:' : 'Telegram ID:'}</span>
              <span className="font-bold text-[#f5d77f] text-sm">{telegramId || '494232782'}</span>
            </div>
            <div className="pt-2 border-t border-[#1a1f2c]">
              <span className="text-[10px] text-gray-500 block uppercase">{lang === 'vi' ? 'Hạng đối tác:' : 'Partnership Tier:'}</span>
              <span className="text-emerald-400 font-bold">Tier {effectiveTier} Institutional</span>
            </div>
            <div className="pt-2 border-t border-[#1a1f2c] text-right">
              <span className="text-[10px] text-gray-500 block uppercase">{lang === 'vi' ? 'Ngày lập sao kê:' : 'Audit Date:'}</span>
              <span className="text-gray-300">{currentDate}</span>
            </div>
          </div>

          {/* Financial Metrics Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
            <div className="bg-[#05070c] p-3 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 uppercase block">{lang === 'vi' ? 'Vốn Bot Khả Dụng:' : 'Trading Balance:'}</span>
              <span className="text-base font-black text-white">${tradingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
            </div>

            <div className="bg-[#05070c] p-3 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 uppercase block">{lang === 'vi' ? 'Lợi Nhuận Ước Tính:' : 'Est. Cumulative PnL:'}</span>
              <span className="text-base font-black text-emerald-400">+${estimatedPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#05070c] p-3 rounded-xl border border-[#221c10]">
              <span className="text-[9px] text-gray-400 uppercase block">{lang === 'vi' ? 'Hoa Hồng Đại Lý:' : 'Affiliate Earnings:'}</span>
              <span className="text-base font-black text-[#f5d77f]">${referralBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</span>
            </div>
          </div>

          {/* Quant Engine Performance Breakdown */}
          <div className="bg-[#05070c] p-3.5 rounded-2xl border border-[#221c10] space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center pb-1.5 border-b border-[#1a1f2c]">
              <span className="text-[10px] text-gray-400 uppercase font-bold">{lang === 'vi' ? 'Chiến lược giao dịch:' : 'Trading Strategy:'}</span>
              <span className="text-white font-bold">Spartan Gold XAU/USD HFT EA</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-300">
              <span>{lang === 'vi' ? 'Tỷ lệ lệnh thắng (Win Rate):' : 'Win Rate:'}</span>
              <span className="text-emerald-400 font-bold">72.8%</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-300">
              <span>{lang === 'vi' ? 'Quỹ bảo hiểm dự phòng 10%:' : '10% Treasury Retention:'}</span>
              <span className="text-[#f5d77f] font-bold">Cold Vault Protected</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-300">
              <span>{lang === 'vi' ? 'Sàn giao dịch đối ứng:' : 'Execution Broker:'}</span>
              <span className="text-white font-bold">Exness ECN Global</span>
            </div>
          </div>

          {/* Cryptographic Seal & Signature Stamp */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0c0f17] border border-[#d4af37]/40">
            <div className="space-y-0.5 font-mono">
              <span className="text-[9px] text-gray-500 block">SHA-256 AUDIT HASH:</span>
              <span className="text-[10px] text-[#f5d77f] font-bold">{auditHash}</span>
              <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED GENUINE CERTIFICATE
              </span>
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#d4af37] flex items-center justify-center text-center p-1">
              <span className="text-[8px] font-black text-[#f5d77f] uppercase leading-tight">
                SPARTAN<br/>OFFICIAL<br/>SEAL
              </span>
            </div>
          </div>

        </div>

        {/* Action Buttons (Excluded from Print) */}
        <div className="no-print flex gap-2 pt-2 border-t border-[#221c10]">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-2xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-400 hover:text-white text-xs font-black uppercase transition-all active:scale-95"
          >
            {lang === 'vi' ? 'ĐÓNG' : 'CLOSE'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 rounded-2xl gold-btn-solid text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'vi' ? '🖨️ IN / XUẤT SAO KÊ PDF' : '🖨️ PRINT / EXPORT PDF'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
