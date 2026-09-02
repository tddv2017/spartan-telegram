'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Zap,
  QrCode,
  ExternalLink,
  Flame,
  Camera
} from 'lucide-react';
import { getQrCodeUrl } from '@/lib/admin3faService';

interface ViralPnlModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade?: {
    id: string;
    symbol: string;
    type: string;
    lots: number;
    openPrice: number;
    closePrice: number;
    pnl: number;
    pnlPercentage: number;
    timestamp: string;
  } | null;
  overallPnl?: number;
  overallGrowth?: number;
  username?: string;
  telegramId?: string;
}

export const ViralPnlModal: React.FC<ViralPnlModalProps> = ({
  isOpen,
  onClose,
  trade,
  overallPnl,
  overallGrowth,
  username = 'spartan_trader',
  telegramId = '494232782',
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Derive display values
  const isTradeMode = !!trade;
  const pnlValue = isTradeMode ? trade.pnl : (overallPnl || 365.00);
  const growthValue = isTradeMode ? trade.pnlPercentage : (overallGrowth || 1.46);
  const isPositive = pnlValue >= 0;
  const displaySymbol = trade?.symbol || 'XAUUSD (Gold)';
  const displayType = trade?.type || 'BUY';
  const displayLots = trade?.lots ? `${trade.lots} Lot` : 'Master Pool';
  const displayOpen = trade?.openPrice ? trade.openPrice.toFixed(2) : '2498.50';
  const displayClose = trade?.closePrice ? trade.closePrice.toFixed(2) : '2505.80';

  const refLink = `https://t.me/SpartanQuantAIBot?start=ref_${telegramId || '494232782'}`;
  const qrCodeImgUrl = getQrCodeUrl(refLink);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const shareText = `🔥 SPARTAN QUANT 300 AI VỪA CHỐT LỜI!\n\n` +
      `🎯 Cặp giao dịch: ${displaySymbol}\n` +
      `💵 Lợi nhuận: +$${Math.abs(pnlValue).toFixed(2)} USDT (+${growthValue.toFixed(2)}%)\n` +
      `👥 Nhận chia sẻ lợi nhuận thụ động 24/7 tự động cùng tôi tại Spartan Quant Bot:\n` +
      `${refLink}`;

    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;
    
    // Check if Telegram WebApp SDK is available
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(tgShareUrl);
    } else {
      window.open(tgShareUrl, '_blank');
    }
  };

  // Generate PNG image using an offscreen HTML5 canvas
  const handleDownloadPoster = async () => {
    try {
      setDownloading(true);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 720;
      canvas.height = 1000;

      // Draw background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 720, 1000);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#0b1120');
      bgGrad.addColorStop(1, '#05070b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 720, 1000);

      // Outer golden/orange glow border
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ff5500';
      ctx.strokeRect(16, 16, 688, 968);

      // Inner subtle border
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.strokeRect(22, 22, 676, 956);

      // Header Brand
      ctx.fillStyle = '#ff5500';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('⚡ SPARTAN QUANT 300 AI', 48, 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('HỆ THỐNG GIAO DỊCH ĐỊNH LƯỢNG MASTER POOL', 48, 95);

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(48, 120);
      ctx.lineTo(672, 120);
      ctx.stroke();

      // Asset & Strategy Tag
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`${displaySymbol} • ${displayType} ${displayLots}`, 48, 170);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText(`Mở: ${displayOpen} ➔ Đóng: ${displayClose}`, 48, 200);

      // Profit Box
      ctx.fillStyle = 'rgba(0, 223, 137, 0.08)';
      ctx.fillRect(48, 240, 624, 260);
      ctx.strokeStyle = 'rgba(0, 223, 137, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 240, 624, 260);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('LỢI NHUẬN GIAO DỊCH (REAL PROFIT)', 72, 280);

      // Giant Profit Text
      ctx.fillStyle = isPositive ? '#00df89' : '#ff2d55';
      ctx.font = 'black 64px sans-serif';
      const pnlStr = `${isPositive ? '+' : ''}$${Math.abs(pnlValue).toFixed(2)} USDT`;
      ctx.fillText(pnlStr, 72, 360);

      // Growth Pill
      ctx.fillStyle = isPositive ? 'rgba(0, 223, 137, 0.2)' : 'rgba(255, 45, 85, 0.2)';
      ctx.fillRect(72, 400, 220, 50);
      ctx.fillStyle = isPositive ? '#00df89' : '#ff2d55';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(`${growthValue >= 0 ? '+' : ''}${growthValue.toFixed(2)}% ROI`, 95, 436);

      // User Credentials
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`Nhà đầu tư: @${username}`, 48, 560);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText(`Telegram ID: ${telegramId} • Đã xác thực`, 48, 590);

      // Load QR Code into canvas
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrCodeImgUrl;

      await new Promise((resolve) => {
        qrImg.onload = () => {
          // White background card for QR Code
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(48, 650, 180, 180);
          ctx.drawImage(qrImg, 58, 660, 160, 160);

          // QR Code Call To Action
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('QUÉT MÃ ĐỂ NHẬN CHIA LÃI', 250, 710);

          ctx.fillStyle = '#ff5500';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('Đầu tư tự động cùng Spartan Quant Bot 24/7', 250, 745);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px monospace';
          ctx.fillText(`Link: t.me/SpartanQuantAIBot`, 250, 780);

          // Footer
          ctx.fillStyle = '#475569';
          ctx.font = '12px sans-serif';
          ctx.fillText('Mô hình giao dịch định lượng AI • Quản trị rủi ro đa tầng • Exness MT5 Master', 48, 930);

          resolve(true);
        };
        qrImg.onerror = () => resolve(true);
      });

      // Export image
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `spartan-pnl-${trade?.id || 'live'}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border-2 border-[#ff5500] rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_40px_rgba(255,85,0,0.3)] space-y-4 p-5 text-white max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#ff5500] animate-bounce" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              POSTER KHOE LÃI SPARTAN QUANT
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Visual PnL Card */}
        <div 
          ref={posterRef}
          className="relative bg-gradient-to-b from-[#131927] via-[#090d16] to-[#05070b] border border-amber-400/40 rounded-2xl p-4 space-y-3.5 shadow-2xl overflow-hidden"
        >
          {/* Subtle Spartan Watermark */}
          <div className="absolute right-[-10px] top-[-10px] opacity-10 text-[100px] font-black pointer-events-none select-none">
            ⚡
          </div>

          {/* Card Top Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff5500] animate-ping" />
              <span className="text-[11px] font-black text-[#ff5500] tracking-wider uppercase font-mono">
                SPARTAN QUANT 300 AI
              </span>
            </div>
            <span className="text-[9px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 font-mono">
              EXNESS MT5 LIVE
            </span>
          </div>

          {/* Trade Details Badge */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-300 font-mono">{displaySymbol}</span>
              <span className="text-[10px] font-black bg-[#00df89]/20 text-[#00df89] px-2 py-0.5 rounded border border-[#00df89]/30 uppercase font-mono">
                {displayType} {displayLots}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
              Khớp giá: {displayOpen} ➔ {displayClose}
            </span>
          </div>

          {/* Giant Glowing Profit Section */}
          <div className="bg-[#00df89]/10 border border-[#00df89]/40 rounded-xl p-3.5 text-center space-y-1">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block">
              LỢI NHUẬN THỰC NHẬN
            </span>
            <div className="text-3xl font-black text-[#00df89] font-mono tracking-tight drop-shadow-[0_0_12px_rgba(0,223,137,0.5)]">
              {isPositive ? '+' : ''}${Math.abs(pnlValue).toFixed(2)} USDT
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-black text-[#00df89] bg-[#00df89]/20 px-2.5 py-0.5 rounded-full font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{growthValue >= 0 ? '+' : ''}{growthValue.toFixed(2)}% ROI</span>
            </div>
          </div>

          {/* User Tag and QR Code Area */}
          <div className="flex items-center justify-between pt-1 border-t border-[#1f293d]/60">
            <div>
              <span className="text-[11px] font-bold text-white block">Trader: @{username}</span>
              <span className="text-[9px] text-gray-400 font-mono block mt-0.5">ID: {telegramId}</span>
              <span className="text-[9px] text-[#ff5500] font-bold block mt-1">
                👉 Quét mã nhận chia lãi tự động
              </span>
            </div>

            {/* QR Code image */}
            <div className="bg-white p-1 rounded-xl shadow-md shrink-0">
              <img 
                src={qrCodeImgUrl} 
                alt="Referral QR Code" 
                className="w-16 h-16 object-contain rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary: 1-Tap Share to Telegram */}
          <button
            onClick={handleShareTelegram}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(14,165,233,0.4)] hover:opacity-95 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            <span>📲 CHIA SẺ TELEGRAM (1-CHẠM)</span>
          </button>

          {/* Secondary: Download Poster Image */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPoster}
              disabled={downloading}
              className="py-2.5 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Đang tạo ảnh...' : '💾 Tải ảnh PNG'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-300 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00df89]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép Ref'}</span>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 text-center leading-relaxed">
          Mỗi khách hàng đăng ký và nạp tiền qua link của bạn, bạn sẽ nhận hoa hồng tự động lên tới <strong>20% phí giao dịch</strong>!
        </p>
      </div>
    </div>
  );
};
