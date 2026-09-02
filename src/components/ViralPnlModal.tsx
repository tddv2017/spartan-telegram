'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  CheckCircle2, 
  TrendingUp, 
  Radio,
  Flame,
  Loader2
} from 'lucide-react';
import { toPng } from 'html-to-image';
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
  const [qrBase64, setQrBase64] = useState<string>('');
  const posterRef = useRef<HTMLDivElement>(null);

  // Derive display values
  const isTradeMode = !!trade;
  const rawPnl = isTradeMode ? trade.pnl : (overallPnl ?? 365.00);
  const pnlValue = Math.abs(rawPnl); // Always show positive profit on brag poster
  const rawGrowth = isTradeMode ? trade.pnlPercentage : (overallGrowth ?? 1.46);
  const growthValue = Math.abs(rawGrowth);

  const displaySymbol = trade?.symbol || 'XAUUSD (Gold Scalp M5)';
  const displayType = trade?.type || 'BUY / LONG';
  const displayLots = trade?.lots ? `${trade.lots} Lot` : 'Master Pool';
  const displayOpen = trade?.openPrice && trade.openPrice > 0 ? trade.openPrice.toFixed(2) : '2498.50';
  const displayClose = trade?.closePrice && trade.closePrice > 0 ? trade.closePrice.toFixed(2) : '2505.80';

  const refLink = `https://t.me/SpartanQuantAIBot?start=ref_${telegramId || '494232782'}`;
  const qrCodeImgUrl = getQrCodeUrl(refLink);

  // Pre-convert QR to Base64 to guarantee zero CORS/tainting issues on export
  useEffect(() => {
    let isSubscribed = true;
    const loadQrBase64 = async () => {
      try {
        const res = await fetch(qrCodeImgUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isSubscribed && reader.result) {
            setQrBase64(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        if (isSubscribed) setQrBase64(qrCodeImgUrl);
      }
    };

    if (isOpen) {
      loadQrBase64();
    }
    return () => { isSubscribed = false; };
  }, [isOpen, qrCodeImgUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const shareText = `🔥 SPARTAN QUANT 300 AI VỪA CHỐT LỜI THÀNH CÔNG!\n\n` +
      `🎯 Cặp giao dịch: ${displaySymbol}\n` +
      `💵 Lợi nhuận: +$${pnlValue.toFixed(2)} USDT (+${growthValue.toFixed(2)}% ROI)\n` +
      `👥 Nhận chia sẻ lợi nhuận thụ động 24/7 cùng tôi tại Spartan Quant Bot:\n` +
      `${refLink}`;

    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;
    
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(tgShareUrl);
    } else {
      window.open(tgShareUrl, '_blank');
    }
  };

  // Download exact pixel-perfect image of the on-screen poster
  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    try {
      setDownloading(true);
      // Wait 100ms to ensure all fonts and styles are fully rendered
      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2.5, // Ultra-sharp resolution
        cacheBust: true,
        style: {
          transform: 'none',
          margin: '0 auto',
        }
      });

      const downloadLink = document.createElement('a');
      downloadLink.download = `spartan-pnl-${trade?.id || 'live'}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
    } catch (err) {
      console.error('Failed to export poster image:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 animate-in fade-in duration-200">
      <div className="bg-[#0b0e17] border border-[#ff5500]/60 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(255,85,0,0.35)] space-y-3.5 p-4 text-white max-h-[96vh] overflow-y-auto">
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1f293d] pb-2.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#ff5500] animate-bounce" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              POSTER KHOE LÃI SPARTAN PRO
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* THE POSTER ELEMENT (EXACT ELEMENT CAPTURED BY HTML-TO-IMAGE) */}
        {/* ============================================================ */}
        <div 
          ref={posterRef}
          className="relative bg-gradient-to-b from-[#131927] via-[#090d16] to-[#04060a] border-2 border-amber-400/50 rounded-2xl p-4 space-y-3 shadow-2xl overflow-hidden text-left select-none"
        >
          {/* Subtle Spartan Ambient Watermark */}
          <div className="absolute right-[-15px] top-[-15px] opacity-10 text-[110px] font-black pointer-events-none select-none">
            ⚡
          </div>

          {/* Card Top Brand Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5500] animate-ping" />
              <span className="text-xs font-black text-[#ff5500] tracking-wider uppercase font-mono">
                SPARTAN QUANT 300 AI
              </span>
            </div>
            <span className="text-[9px] font-bold text-[#00df89] bg-[#00df89]/15 px-2 py-0.5 rounded-full border border-[#00df89]/30 font-mono flex items-center gap-1">
              <Radio className="w-2 h-2 animate-pulse" />
              <span>EXNESS LIVE</span>
            </span>
          </div>

          {/* Trade Details / Strategy */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-300 font-mono tracking-tight">
                {displaySymbol}
              </span>
              <span className="text-[10px] font-black bg-[#00df89]/20 text-[#00df89] px-2 py-0.5 rounded-md border border-[#00df89]/40 uppercase font-mono">
                {displayType} • {displayLots}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono block mt-1">
              Khớp lệnh: <strong className="text-gray-200">{displayOpen}</strong> ➔ <strong className="text-gray-200">{displayClose}</strong>
            </span>
          </div>

          {/* Giant Glowing Profit Section */}
          <div className="bg-[#00df89]/10 border border-[#00df89]/50 rounded-2xl p-4 text-center space-y-1 shadow-[inset_0_0_20px_rgba(0,223,137,0.1)]">
            <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest block font-sans">
              LỢI NHUẬN GIAO DỊCH THỰC NHẬN
            </span>
            <div className="text-3xl font-black text-[#00df89] font-mono tracking-tight drop-shadow-[0_0_16px_rgba(0,223,137,0.6)]">
              +${pnlValue.toFixed(2)} USDT
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-black text-[#00df89] bg-[#00df89]/25 px-3 py-1 rounded-full font-mono border border-[#00df89]/40 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{growthValue.toFixed(2)}% ROI</span>
            </div>
          </div>

          {/* User Investor Credential & QR Code */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10 gap-2">
            <div className="space-y-0.5">
              <div className="text-[11px] font-black text-white">
                Nhà đầu tư: <span className="text-cyan-300">@{username}</span>
              </div>
              <div className="text-[9px] text-gray-400 font-mono">
                Telegram ID: <span className="text-gray-300">{telegramId}</span> • Đã xác thực
              </div>
              <div className="text-[9px] text-[#ff5500] font-bold pt-1">
                👉 Quét mã nhận chia lãi tự động
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-1 rounded-xl shadow-lg shrink-0 border-2 border-amber-400/40">
              {qrBase64 ? (
                <img 
                  src={qrBase64} 
                  alt="Referral QR Code" 
                  className="w-16 h-16 object-contain rounded-md"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-gray-400 text-[8px]">
                  Loading...
                </div>
              )}
            </div>
          </div>

          {/* Footer Sub-Note */}
          <div className="text-[8px] text-gray-500 text-center font-mono pt-1 border-t border-white/5">
            Mô hình giao dịch định lượng AI • Quản trị rủi ro đa tầng • Exness MT5 Master
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary 1-Tap Share to Telegram */}
          <button
            onClick={handleShareTelegram}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(14,165,233,0.4)] hover:opacity-95 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            <span>📲 CHIA SẺ TELEGRAM (1-CHẠM)</span>
          </button>

          {/* Download & Copy Ref Links */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPoster}
              disabled={downloading}
              className="py-2.5 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity shadow-md"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloading ? 'Đang xuất...' : '💾 Tải ảnh PNG'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="py-2.5 rounded-xl bg-[#131927] hover:bg-[#1f293d] border border-[#1f293d] text-gray-300 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#00df89]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép Ref'}</span>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 text-center leading-relaxed">
          Ảnh tải về sẽ <strong>giống hệt 100%</strong> hình hiển thị trên màn hình với chất lượng cao sắc nét!
        </p>
      </div>
    </div>
  );
};
