'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'vi' | 'en';

export const translations = {
  // Navigation Tabs
  nav_overview: { vi: 'TỔNG QUAN', en: 'OVERVIEW' },
  nav_wallet: { vi: 'VÍ ĐẦU TƯ', en: 'WALLET' },
  nav_analytics: { vi: 'THỐNG KÊ', en: 'ANALYTICS' },
  nav_reseller: { vi: 'ĐỐI TÁC', en: 'RESELLER' },
  nav_admin: { vi: 'QUẢN TRỊ', en: 'ADMIN' },

  // Top Bar & Header
  top_close: { vi: 'Đóng', en: 'Close' },
  bot_live: { vi: 'BOT LIVE', en: 'BOT LIVE' },
  bot_stopped: { vi: 'BOT DỪNG', en: 'BOT STOPPED' },
  bot_standby: { vi: 'STANDBY', en: 'STANDBY' },
  rank_supreme: { vi: 'LÃNH ĐẠO TỐI CAO', en: 'SUPREME LEADER' },
  rank_reseller_prefix: { vi: 'ĐỐI TÁC CẤP', en: 'RESELLER TIER' },
  rank_trader: { vi: 'NHÀ ĐẦU TƯ SPARTAN', en: 'SPARTAN TRADER' },

  // Balance Card
  total_balance: { vi: 'Tổng Tài Sản (Gồm Vốn & Hoa Hồng):', en: 'Total Balance (Capital & Rebate):' },
  trading_capital: { vi: 'Vốn Bot Giao Dịch:', en: 'Trading Capital:' },
  rebate: { vi: 'Hoa Hồng:', en: 'Rebate:' },
  accumulated_profit: { vi: 'Lợi Nhuận Tích Lũy Từ Bot:', en: 'Accumulated Bot Profit:' },

  // Action Buttons
  bot_running: { vi: 'BOT ĐANG CHẠY', en: 'BOT ACTIVE' },
  engage_bot: { vi: 'KÍCH HOẠT BOT', en: 'ENGAGE BOT' },
  standby: { vi: 'TẠM DỪNG (STANDBY)', en: 'STANDBY' },
  support_247: { vi: 'Hỗ Trợ 24/7 (Admin)', en: '24/7 Support (Admin)' },
  live_signal: { vi: 'Kênh Tín Hiệu Live', en: 'Live Signal Channel' },

  // Strategy Card
  strategy_title: { vi: 'CHIẾN LƯỢC ĐỊNH LƯỢNG SPARTAN 300 PRO', en: 'SPARTAN 300 PRO QUANT STRATEGY' },
  strategy_desc: {
    vi: 'Vận hành thuật toán Spartan 300 Multi-TF Pro trực tiếp trên sàn Exness ECN. Quản trị rủi ro đa tầng: Tự động kéo Breakeven hòa vốn tại 1.0R, cài đặt Hard Stop-Loss cho 100% lệnh chốt lời/cắt lỗ chuẩn xác.',
    en: 'Running Spartan 300 Multi-TF Pro on Exness ECN. Multi-tier risk defense: Automated breakeven at 1.0R, hard stop-loss on 100% of deals.'
  },

  // Wallet View
  tab_deposit: { vi: 'NẠP TIỀN / DEPOSIT', en: 'DEPOSIT' },
  tab_withdraw: { vi: 'RÚT TIỀN / WITHDRAW', en: 'WITHDRAW' },
  deposit_qr_title: { vi: 'NẠP TIỀN QUA MÃ QR (USDT TRC20)', en: 'DEPOSIT VIA QR CODE (USDT TRC20)' },
  deposit_qr_sub: { vi: 'Chuyển trực tiếp từ Binance, OKX, Bybit, Remitano hoặc Ví cá nhân', en: 'Transfer directly from Binance, OKX, Bybit, or personal wallets' },
  deposit_fee_badge: { vi: 'Phí: 9% + $3.00 USD', en: 'Fee: 9% + $3.00 USD' },
  deposit_amount_label: { vi: 'Nhập Số Tiền Muốn Nạp ($ USDT)', en: 'Enter Deposit Amount ($ USDT)' },
  deposit_min_badge: { vi: 'Tối thiểu: $50.00 USDT', en: 'Min: $50.00 USDT' },
  gross_deposit: { vi: 'Số Tiền Nạp Gốc (Gross):', en: 'Gross Deposit Amount:' },
  fee_percentage: { vi: 'Phí Vận Hành Quỹ (9%):', en: 'Fund Management Fee (9%):' },
  fee_network: { vi: 'Phí Mạng Blockchain ($3.00 USD):', en: 'Blockchain Network Fee ($3.00 USD):' },
  net_credited: { vi: 'Thực Nhận Cộng Vốn Bot:', en: 'Net Credited to Bot Fund:' },
  btn_create_order: { vi: '🚀 TẠO LỆNH NẠP & LẤY MÃ QR', en: '🚀 CREATE DEPOSIT ORDER & GET QR' },
  txid_verify_title: { vi: 'XÁC THỰC MÃ BĂM TXID (CHUYỂN TRÒN - KHÔNG CẦN MEMO)', en: 'VERIFY TXID HASH (EXACT AMOUNT - NO MEMO NEEDED)' },
  txid_verify_desc: { vi: 'Rút từ Binance, Bybit, OKX không có ô Memo? Bạn chỉ cần copy mã TxID (Transaction Hash) trên sàn sau khi rút và dán vào đây:', en: 'Withdrawing from Binance/Bybit/OKX without Memo? Copy your TxID (Transaction Hash) from the exchange and paste here:' },
  btn_paste: { vi: 'Dán', en: 'Paste' },
  btn_verify_txid: { vi: '⚡ XÁC THỰC MÃ BĂM & DUYỆT TIỀN NGAY (1S)', en: '⚡ VERIFY TXID HASH & AUTO-APPROVE (1S)' },
  btn_paid: { vi: 'TÔI ĐÃ CHUYỂN TIỀN XONG (ĐÃ THANH TOÁN)', en: 'I HAVE COMPLETED PAYMENT' },
  btn_close_qr: { vi: 'ĐÓNG MÃ QR', en: 'CLOSE QR CODE' },

  // Reseller / Profile
  reseller_title: { vi: 'CHƯƠNG TRÌNH ĐỐI TÁC RESELLER', en: 'RESELLER AFFILIATE PROGRAM' },
  reseller_rebate_badge: { vi: 'Hoa hồng tới 20%', en: 'Up to 20% Rebate' },
  total_rebate: { vi: 'TỔNG HOA HỒNG CỦA BẠN', en: 'YOUR TOTAL REBATE' },
  direct_clients: { vi: 'KHÁCH TRỰC TIẾP (F1)', en: 'DIRECT CLIENTS (F1)' },
  reinvest_btn: { vi: 'TÁI ĐẦU TƯ (0% PHÍ)', en: 'REINVEST (0% FEE)' },
  withdraw_rebate_btn: { vi: 'RÚT HOA HỒNG', en: 'WITHDRAW REBATE' },
  ref_link_label: { vi: 'LINK GIỚI THIỆU CỦA BẠN (GỬI BẠN BÈ ĐỂ NHẬN HOA HỒNG):', en: 'YOUR REFERRAL LINK (SHARE TO EARN REBATES):' },
  btn_copy: { vi: 'Sao chép', en: 'Copy' },
  btn_copied: { vi: 'Đã chép', en: 'Copied' },
  tier_matrix_title: { vi: 'BẢNG 10 CẤP ĐỘ HOA HỒNG RESELLER', en: '10-TIER RESELLER REBATE MATRIX' },

  // Viral Poster
  viral_share_title: { vi: 'POSTER KHOE LÃI SPARTAN PRO', en: 'SPARTAN PRO VIRAL PNL POSTER' },
  viral_real_profit: { vi: 'LỢI NHUẬN GIAO DỊCH THỰC NHẬN', en: 'REAL TRADING PROFIT' },
  btn_share_tg: { vi: '📲 CHIA SẺ TELEGRAM (1-CHẠM)', en: '📲 SHARE ON TELEGRAM (1-TAP)' },
  btn_download_png: { vi: '💾 Tải ảnh PNG', en: '💾 Download PNG' },
  btn_copy_ref: { vi: 'Sao chép Ref', en: 'Copy Ref Link' }
} as const;

export type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('vi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('spartan_lang') as Language;
      if (saved === 'vi' || saved === 'en') {
        setLangState(saved);
      }
    } catch (e) {}
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('spartan_lang', newLang);
    } catch (e) {}
  };

  const toggleLang = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
  };

  const t = (key: TranslationKey): string => {
    const item = translations[key];
    if (!item) return String(key);
    return item[lang] || item['vi'] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      lang: 'vi' as Language,
      setLang: () => {},
      toggleLang: () => {},
      t: (key: TranslationKey) => translations[key]?.vi || String(key)
    };
  }
  return context;
};
