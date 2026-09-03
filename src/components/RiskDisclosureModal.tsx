'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, X, RotateCcw, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RiskAgreementRecord } from '@/lib/firebaseService';

interface RiskDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  depositAmount: number;
  userId: string;
  username: string;
  onConfirm: (agreement: RiskAgreementRecord) => void;
}

export const RiskDisclosureModal: React.FC<RiskDisclosureModalProps> = ({
  isOpen,
  onClose,
  depositAmount,
  userId,
  username,
  onConfirm
}) => {
  const { lang } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');

  useEffect(() => {
    setLiveTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCheck1(false);
      setCheck2(false);
      setCheck3(false);
      setHasSigned(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Canvas drawing setup
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
      };
    } else {
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSigned(true);
    setErrorMsg(null);

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = '#d4af37'; // 24K Gold stroke
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!check1 || !check2 || !check3) {
      setErrorMsg(
        lang === 'vi'
          ? '⚠️ Vui lòng tích chọn đầy đủ cả 3 điều khoản cam kết trước khi ký!'
          : '⚠️ Please check all 3 mandatory acknowledgement boxes before signing!'
      );
      return;
    }

    if (!hasSigned || !canvasRef.current) {
      setErrorMsg(
        lang === 'vi'
          ? '⚠️ Vui lòng vẽ hoặc ký tên vào khung chữ ký số trước khi tiếp tục!'
          : '⚠️ Please draw your signature in the designated box before proceeding!'
      );
      return;
    }

    const signatureBase64 = canvasRef.current.toDataURL('image/png');
    const signedAt = new Date().toISOString();
    
    // Generate a client-side SHA-256 verification hash
    const rawPayload = `${userId}|${depositAmount}|${signedAt}|SPARTAN_DISCLAIMER_V2.0`;
    let signatureHash = 'SPT_' + Date.now();
    try {
      const msgBuffer = new TextEncoder().encode(rawPayload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {}

    const agreementRecord: RiskAgreementRecord = {
      signedAt,
      signatureImageBase64: signatureBase64,
      signatureHash,
      termsVersion: 'v2.0_INSTITUTIONAL',
      treasury10PctAcknowledged: true,
      volatilityAcknowledged: true
    };

    onConfirm(agreementRecord);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#080b12] border-2 border-[#221c10] rounded-3xl p-5 md:p-6 shadow-[0_0_50px_rgba(212,175,55,0.2)] max-h-[95vh] overflow-y-auto space-y-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-400 hover:text-white transition-all active:scale-95"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Institutional Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-xl shadow-[0_0_16px_rgba(212,175,55,0.25)]">
            ⚖️
          </div>
          <h3 className="text-sm md:text-base font-black text-[#f5d77f] uppercase tracking-wider">
            {lang === 'vi' ? 'TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM & KÝ SỐ ĐẦU TƯ' : 'INVESTMENT RISK DISCLOSURE & LEGAL AGREEMENT'}
          </h3>
          <p className="text-[10px] font-mono text-gray-400">
            SPARTAN QUANT AI • {lang === 'vi' ? 'THỎA THUẬN LƯU KÝ ĐỊNH CHẾ' : 'INSTITUTIONAL RISK AGREEMENT V2.0'}
          </p>
          <div className="inline-block px-3 py-1 rounded-full bg-[#0c0f17] border border-[#d4af37]/30 text-[11px] font-mono font-bold text-white">
            {lang === 'vi' ? 'Số tiền nạp:' : 'Deposit Amount:'}{' '}
            <span className="text-[#f5d77f]">${depositAmount.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* Scrollable Legal Terms Box */}
        <div className="bg-[#05070c] border border-[#221c10] rounded-2xl p-3.5 max-h-44 overflow-y-auto space-y-3 text-xs text-gray-300 leading-relaxed shadow-inner">
          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-[#f5d77f] uppercase flex items-center gap-1.5">
              <span>1.</span>
              <span>{lang === 'vi' ? 'NGUYÊN TẮC TỰ NGUYỆN & RỦI RO THỊ TRƯỜNG' : 'VOLUNTARY CONSENT & MARKET VOLATILITY'}</span>
            </h4>
            <p className="text-[10px] text-gray-400">
              {lang === 'vi'
                ? 'Nhà đầu tư xác nhận tham gia hoàn toàn trên tinh thần tự nguyện, có đầy đủ năng lực hành vi dân sự. Thị trường Vàng (XAU/USD) và tài chính định lượng có rủi ro biến động tự nhiên. Hiệu suất trong quá khứ không mang tính bảo đảm hoặc cam kết lợi nhuận cố định trong tương lai.'
                : 'The investor confirms voluntary participation with full legal capacity. Gold (XAU/USD) algorithmic trading involves inherent market volatility. Historical trading performance does not guarantee or represent fixed future yields.'}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-[#f5d77f] uppercase flex items-center gap-1.5">
              <span>2.</span>
              <span>{lang === 'vi' ? 'QUỸ DỰ PHÒNG AN TOÀN 10% (COLD VAULT RETENTION)' : '10% TREASURY RETENTION RESERVE'}</span>
            </h4>
            <p className="text-[10px] text-gray-400">
              {lang === 'vi'
                ? 'Để bảo vệ tính thanh khoản và sự sống còn của toàn bộ hệ sinh thái trước bão giá, mỗi khoản nạp được trích giữ 10% đưa vào Quỹ Dự Phòng Lưu Ký Bảo Hiểm (Cold Vault). Số vốn còn lại được phân bổ trực tiếp vào Robot EA AI trên sàn Exness ECN.'
                : 'To protect platform liquidity and safeguard ecosystem resilience, 10% of each deposit is allocated to the Treasury Reserve Insurance Fund (Cold Vault). The remaining capital is deployed directly to Exness ECN MT5 EA.'}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-[#f5d77f] uppercase flex items-center gap-1.5">
              <span>3.</span>
              <span>{lang === 'vi' ? 'MINH BẠCH BIỂU PHÍ VẬN HÀNH NỀN TẢNG' : 'TRANSPARENT FEE STRUCTURE'}</span>
            </h4>
            <p className="text-[10px] text-gray-400">
              {lang === 'vi'
                ? '• Phí Khởi Tạo Nguồn Vốn: 9% phí dịch vụ nền tảng + $3.00 USD phí gas mạng Tron TRC20.\n• Phí Dịch Vụ Rút Vốn: 4% - 15% theo thời gian nắm giữ + $5.00 USD phí gas on-chain.\n• Tái Phân Bổ Chiết Khấu Đối Tác F1: 0% Phí (Miễn phí 100%).'
                : '• Initiation Fee: 9% platform service fee + $3.00 USD TRC20 network gas.\n• Withdrawal Service Fee: 4% - 15% based on holding tenure + $5.00 USD on-chain gas.\n• Partner Rebate Allocation: 0% Fee (100% Free).'}
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-[#f5d77f] uppercase flex items-center gap-1.5">
              <span>4.</span>
              <span>{lang === 'vi' ? 'SỰ CỐ BẤT KHẢ KHÁNG & CÔNG TẮC NGẮT KHẨN CẤP' : 'FORCE MAJEURE & EMERGENCY KILL-SWITCH'}</span>
            </h4>
            <p className="text-[10px] text-gray-400">
              {lang === 'vi'
                ? 'Ban Điều Hành có quyền kích hoạt công tắc ngắt bot khẩn cấp (Global Kill-Switch) khi thị trường xảy ra biến động bão giá cực đoan (Chiến tranh, NFP, CPI) hoặc sự cố từ đối tác Exness / TronGrid.'
                : 'The Executive Team reserves the right to engage the Global Kill-Switch during extreme black-swan market volatility or third-party infrastructure outages (Exness / TronGrid).'}
            </p>
          </div>
        </div>

        {/* 3 Mandatory Checkboxes */}
        <div className="space-y-2 text-xs">
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#05070c] border border-[#221c10] cursor-pointer hover:border-[#d4af37]/40 transition-colors">
            <input
              type="checkbox"
              checked={check1}
              onChange={(e) => setCheck1(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#d4af37] rounded cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-gray-300 font-medium leading-tight">
              {lang === 'vi'
                ? 'Tôi xác nhận đã đọc, hiểu rõ và tự nguyện chấp nhận toàn bộ các điều khoản rủi ro ở trên.'
                : 'I acknowledge that I have read, understood, and voluntarily accept all investment risk terms.'}
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#05070c] border border-[#221c10] cursor-pointer hover:border-[#d4af37]/40 transition-colors">
            <input
              type="checkbox"
              checked={check2}
              onChange={(e) => setCheck2(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#d4af37] rounded cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-gray-300 font-medium leading-tight">
              {lang === 'vi'
                ? 'Tôi đồng thuận chính sách trích giữ 10% Quỹ Dự Phòng và biểu phí Nạp 9% + $3 gas on-chain.'
                : 'I agree to the 10% Treasury Retention Policy and the 9% + $3 gas deposit fee structure.'}
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#05070c] border border-[#221c10] cursor-pointer hover:border-[#d4af37]/40 transition-colors">
            <input
              type="checkbox"
              checked={check3}
              onChange={(e) => setCheck3(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#d4af37] rounded cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-gray-300 font-medium leading-tight">
              {lang === 'vi'
                ? 'Cam đoan nguồn vốn nạp hoàn toàn hợp pháp, tự chịu trách nhiệm về quyết định tài chính cá nhân.'
                : 'I certify that my funds are legally obtained and assume full responsibility for my financial decisions.'}
            </span>
          </label>
        </div>

        {/* Digital Signature Canvas Pad */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️</span>
              <span>{lang === 'vi' ? 'KÝ TÊN XÁC NHẬN ĐIỆN TỬ:' : 'DRAW DIGITAL SIGNATURE:'}</span>
            </span>
            {hasSigned && (
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'vi' ? 'Xóa ký lại' : 'Clear'}</span>
              </button>
            )}
          </div>

          <div className="relative bg-[#05070c] border-2 border-dashed border-[#d4af37]/50 rounded-2xl overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              width={420}
              height={110}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[110px] cursor-crosshair block"
            />
            {!hasSigned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-500 text-[11px] font-mono select-none">
                {lang === 'vi' ? '✍️ Vẽ hoặc ký tên bằng ngón tay / chuột tại đây...' : '✍️ Draw your signature here...'}
              </div>
            )}
          </div>
        </div>

        {/* Live Cryptographic Seal Badge */}
        <div className="p-2.5 rounded-xl bg-[#0c0f17] border border-[#221c10] text-[10px] font-mono space-y-0.5">
          <div className="flex justify-between text-gray-400">
            <span>{lang === 'vi' ? 'Chứng thư số:' : 'Certificate ID:'}</span>
            <span className="text-[#f5d77f] font-bold">#SPT-E-SIGN-2026</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>{lang === 'vi' ? 'Định danh người ký:' : 'Signer Identity:'}</span>
            <span className="text-white font-bold">@{username} (ID: {userId})</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>{lang === 'vi' ? 'Thời gian ký:' : 'Signed Timestamp:'}</span>
            <span className="text-white">{liveTimestamp}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-2xl bg-[#0c0f17] hover:bg-[#141924] border border-[#221c10] text-gray-400 hover:text-white text-xs font-black uppercase transition-all active:scale-95"
          >
            {lang === 'vi' ? 'HỦY BỎ' : 'CANCEL'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-3.5 rounded-2xl gold-btn-solid text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? '⚡ KÝ SỐ & TẠO HÓA ĐƠN NẠP' : '⚡ SIGN & PROCEED TO DEPOSIT'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
