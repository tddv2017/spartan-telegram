'use client';

import React, { useState } from 'react';
import { scanReceiptAndVerifyOnChain, AiScanResult } from '@/lib/aiReceiptScannerService';
import { 
  Camera, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2, 
  X, 
  ExternalLink,
  Sparkles,
  Bot,
  Search,
  Lock
} from 'lucide-react';

interface ReceiptAiAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  expectedGrossAmount?: number;
  userId?: string;
  username?: string;
  onSuccessApproved?: () => void;
}

export const ReceiptAiAppealModal: React.FC<ReceiptAiAppealModalProps> = ({
  isOpen,
  onClose,
  orderId = 'TX_SAMPLE',
  expectedGrossAmount = 1000,
  userId = '494232782',
  username = 'tddv2017',
  onSuccessApproved,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [customMemoInput, setCustomMemoInput] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanResult, setScanResult] = useState<AiScanResult | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setScanResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAiScan = async () => {
    if (!selectedImage && !customMemoInput.trim()) {
      alert('Vui lòng chọn ảnh chụp bill chuyển khoản hoặc nhập mã TxHash/Memo thực tế!');
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    // Step-by-step interactive logs
    setScanStep('🔍 Bước 1/3: AI Vision OCR đang nhận diện chữ, số tiền và mã Hash trên ảnh bill...');
    await new Promise(r => setTimeout(r, 1200));

    setScanStep('📡 Bước 2/3: Đang kết nối API TronScan & TronGrid để truy vấn khối On-Chain...');
    await new Promise(r => setTimeout(r, 1200));

    setScanStep('⚖️ Bước 3/3: Đối soát 4 tiêu chí an ninh (Ví nhận, Trùng lặp, Số tiền, Hợp lệ)...');
    await new Promise(r => setTimeout(r, 1000));

    try {
      const result = await scanReceiptAndVerifyOnChain(
        userId,
        username,
        orderId,
        selectedImage || '',
        customMemoInput,
        expectedGrossAmount
      );

      setScanResult(result);
      if (result.status === 'VERIFIED_MATCH' && onSuccessApproved) {
        onSuccessApproved();
      }
    } catch (err) {
      console.error('Lỗi khi AI quét bill:', err);
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0e17] border-2 border-purple-500/50 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1f293d] flex items-center justify-between bg-[#131927]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>AI GIÁM ĐỊNH BILL & TỰ ĐỘNG DUYỆT</span>
                <span className="text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-mono">OCR V2.0</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono block">
                Khắc phục sự cố chuyển sai Memo & đối soát Blockchain
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#0b0e17] text-gray-400 hover:text-white border border-[#1f293d] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Workspace */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Order Info Badge */}
          <div className="bg-[#131927] p-3 rounded-2xl border border-[#1f293d] flex items-center justify-between font-mono text-[11px]">
            <span className="text-gray-400">Đơn hàng khiếu nại:</span>
            <span className="text-white font-bold">#{orderId} (${expectedGrossAmount.toFixed(2)} USDT)</span>
          </div>

          {/* 1. Upload Screenshot Box */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-bold block text-[11px] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span>1. Tải lên ảnh chụp màn hình Bill chuyển khoản:</span>
            </label>

            <div className="relative border-2 border-dashed border-[#1f293d] hover:border-purple-500/60 rounded-2xl p-4 text-center bg-[#07090e] transition-all cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {selectedImage ? (
                <div className="space-y-2">
                  <img
                    src={selectedImage}
                    alt="Receipt Preview"
                    className="max-h-36 mx-auto rounded-xl object-contain border border-[#1f293d]"
                  />
                  <span className="text-[10px] text-[#00df89] font-bold block">
                    ✓ Đã chọn ảnh bill. Bấm để đổi ảnh khác.
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5 py-3">
                  <Upload className="w-6 h-6 mx-auto text-purple-400 animate-bounce" />
                  <span className="text-[11px] text-gray-300 font-bold block">
                    Chạm để tải ảnh bill từ Binance / OKX / Bybit / TrustWallet
                  </span>
                  <span className="text-[9px] text-gray-500 block font-mono">
                    Hỗ trợ định dạng: PNG, JPG, JPEG
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Optional Manual Input for TxHash or Typed Memo */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-bold block text-[11px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Nhập mã TxHash hoặc Memo thực tế bạn đã gõ (Tùy chọn):</span>
            </label>
            <input
              type="text"
              value={customMemoInput}
              onChange={(e) => setCustomMemoInput(e.target.value)}
              placeholder="VD: SPARTAN_... hoặc TxHash 64 ký tự"
              className="w-full bg-[#131927] border border-[#1f293d] rounded-xl py-2.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* AI Scan Step Progress Banner */}
          {isScanning && (
            <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-500/60 text-purple-300 text-xs font-bold space-y-2 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>{scanStep}</span>
              </div>
            </div>
          )}

          {/* AI VERDICT RESULT BOX */}
          {scanResult && (
            <div className={`p-4 rounded-2xl border space-y-3 animate-in fade-in zoom-in-95 duration-300 ${
              scanResult.status === 'VERIFIED_MATCH'
                ? 'bg-[#00df89]/15 border-[#00df89] text-[#00df89]'
                : 'bg-red-500/20 border-red-500 text-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black uppercase text-xs">
                  {scanResult.status === 'VERIFIED_MATCH' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#00df89]" />
                      <span>XÁC THỰC THÀNH CÔNG (SCORE: 100/100)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>PHÁT HIỆN BẤT THƯỜNG / GIAN LẬN</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40">
                  {scanResult.status}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-gray-200 font-sans">
                {scanResult.aiVerdict}
              </p>

              {/* Anomaly list if fraud */}
              {scanResult.anomalyReasons && scanResult.anomalyReasons.length > 0 && (
                <div className="space-y-1 bg-black/30 p-2.5 rounded-xl text-[10px] font-mono text-red-300">
                  <span className="font-bold text-amber-400 uppercase block">CHI TIẾT LÝ DO:</span>
                  {scanResult.anomalyReasons.map((ar, i) => (
                    <div key={i}>• {ar}</div>
                  ))}
                </div>
              )}

              {/* Action buttons based on outcome */}
              {scanResult.status === 'VERIFIED_MATCH' ? (
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-[#00df89] text-black font-black text-xs uppercase shadow-md hover:opacity-95 transition-opacity"
                >
                  HOÀN TẤT & ĐÓNG
                </button>
              ) : (
                <a
                  href="https://t.me/tddv2017"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 transition-opacity block text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>LIÊN HỆ BỘ PHẬN AN NINH (@tddv2017)</span>
                </a>
              )}
            </div>
          )}

          {/* Action Trigger Button */}
          {!scanResult && (
            <button
              onClick={handleStartAiScan}
              disabled={isScanning}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-[#ff5500] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:opacity-95 transition-all"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Sparkles className="w-4 h-4" />}
              <span>KHỞI CHẠY AI QUÉT & ĐỐI SOÁT BLOCKCHAIN</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
