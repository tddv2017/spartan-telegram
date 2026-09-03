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

  // Equity Chart
  chart_account_growth: { vi: 'ĐƯỜNG CONG TĂNG TRƯỞNG TÀI SẢN', en: 'ACCOUNT GROWTH CURVE' },
  chart_hourly: { vi: '24H THEO GIỜ', en: '24H HOURLY' },
  chart_my_share: { vi: 'CỦA TÔI', en: 'MY SHARE' },
  chart_pool_share: { vi: 'POOL ($50k)', en: 'POOL ($50k)' },
  chart_today: { vi: 'Hôm nay', en: 'Today' },
  chart_touch_hint: { vi: 'Chạm vào các điểm để xem chi tiết', en: 'Tap data points to inspect details' },
  chart_your_equity: { vi: 'Tài sản của bạn:', en: 'Your Equity:' },
  chart_live_equity: { vi: 'Tài sản Pool:', en: 'Pool Equity:' },
  chart_share_ratio_hint: { vi: 'Tài sản theo % vốn góp', en: 'Scaled by your capital share' },
  chart_pool_ratio_hint: { vi: 'Tài sản Master Pool Exness', en: 'Exness Master Pool Equity' },

  // Wallet View
  tab_deposit: { vi: 'NẠP TIỀN / DEPOSIT', en: 'DEPOSIT CAPITAL' },
  tab_withdraw: { vi: 'RÚT TIỀN / WITHDRAW', en: 'WITHDRAW FUNDS' },
  wallet_available_balance: { vi: 'SỐ DƯ VỐN BOT HIỆN TẠI', en: 'CURRENT TRADING BALANCE' },
  net_deposited: { vi: 'Tổng Đã Nạp:', en: 'Total Deposited:' },
  net_withdrawn: { vi: 'Tổng Đã Rút:', en: 'Total Withdrawn:' },
  total_requests: { vi: 'Tổng Lệnh:', en: 'Total Requests:' },
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
  wallet_withdraw_source_label: { vi: 'Chọn nguồn rút tiền:', en: 'Select Withdrawal Source:' },
  wallet_withdraw_from_trading: { vi: 'Vốn Bot Giao Dịch (Phí 9% + $3)', en: 'Trading Capital (Fee 9% + $3)' },
  wallet_withdraw_from_rebate: { vi: 'Hoa Hồng Đối Tác (Phí $5 cố định)', en: 'Affiliate Rebate (Fixed $5 Fee)' },
  wallet_withdraw_addr_label: { vi: 'Địa chỉ ví nhận USDT TRC20:', en: 'Destination USDT TRC20 Address:' },
  wallet_btn_confirm_withdraw: { vi: 'XÁC NHẬN TẠO ĐƠN RÚT TIỀN', en: 'CONFIRM WITHDRAWAL REQUEST' },
  wallet_ledger_title: { vi: 'SỔ CÁI ĐỐI SOÁT GIAO DỊCH (REALTIME)', en: 'TRANSACTION AUDIT LEDGER (REALTIME)' },
  wallet_withdraw_locked_hint: { vi: 'Đang khóa chờ duyệt:', en: 'Locked pending approval:' },
  wallet_available_to_withdraw: { vi: 'Khả dụng rút:', en: 'Available to withdraw:' },

  // Reseller / Profile
  reseller_title: { vi: 'CHƯƠNG TRÌNH ĐỐI TÁC LIÊN KẾT F1', en: 'F1 AFFILIATE PARTNER PROGRAM' },
  reseller_rebate_badge: { vi: 'Chiết khấu tới 50%', en: 'Up to 50% Rebate' },
  total_rebate: { vi: 'TỔNG CHIẾT KHẤU ĐỐI TÁC CỦA BẠN', en: 'YOUR TOTAL PARTNER REBATE' },
  direct_clients: { vi: 'THÀNH VIÊN TRỰC TIẾP (F1)', en: 'DIRECT MEMBERS (F1)' },
  direct_clients_count: { vi: 'Thành viên', en: 'Members' },
  reinvest_btn: { vi: 'TÁI ĐẦU TƯ (0% PHÍ)', en: 'REINVEST (0% FEE)' },
  withdraw_rebate_btn: { vi: 'RÚT CHIẾT KHẤU', en: 'WITHDRAW REBATE' },
  ref_link_label: { vi: 'LIÊN KẾT GIỚI THIỆU TRỰC TIẾP (CHIA SẺ ĐỂ NHẬN CHIẾT KHẤU):', en: 'YOUR DIRECT REFERRAL LINK (SHARE TO EARN REBATES):' },
  btn_copy: { vi: 'Sao chép', en: 'Copy' },
  btn_copied: { vi: 'Đã chép', en: 'Copied' },
  tier_matrix_title: { vi: 'BẢNG 10 HẠNG THÀNH VIÊN ĐỐI TÁC', en: '10-TIER PARTNER MATRIX' },
  ref_current_tier: { vi: 'Hạng hiện tại', en: 'Current Tier' },
  ref_your_tier: { vi: 'HẠNG CỦA BẠN', en: 'YOUR TIER' },
  direct_clients_title: { vi: 'DANH SÁCH THÀNH VIÊN F1 TRỰC TIẾP', en: 'DIRECT F1 MEMBERS' },
  reinvest_modal_title: { vi: 'TÁI ĐẦU TƯ VÀO VỐN BOT', en: 'REINVEST INTO BOT CAPITAL' },
  reinvest_available: { vi: 'Chiết khấu khả dụng:', en: 'Available Rebate:' },
  reinvest_fee_free: { vi: '0% (MIỄN PHÍ 100%)', en: '0% (100% FREE)' },
  reinvest_confirm_btn: { vi: 'XÁC NHẬN TÁI ĐẦU TƯ NGAY', en: 'CONFIRM REINVEST NOW' },
  withdraw_modal_title: { vi: 'RÚT CHIẾT KHẤU VỀ VÍ USDT TRC20', en: 'WITHDRAW REBATE (USDT TRC20)' },
  withdraw_wallet_label: { vi: 'Địa chỉ ví nhận tiền (USDT TRC20):', en: 'Receiving USDT TRC20 Address:' },
  withdraw_confirm_btn: { vi: 'XÁC NHẬN RÚT CHIẾT KHẤU', en: 'CONFIRM WITHDRAWAL' },

  // Analytics View
  analytics_title: { vi: 'HIỆU SUẤT ĐỊNH LƯỢNG QUANT AI (LIVE)', en: 'QUANT AI LIVE PERFORMANCE' },
  analytics_win_rate: { vi: 'TỶ LỆ THẮNG (WIN RATE)', en: 'WIN RATE' },
  analytics_profit_factor: { vi: 'HỆ SỐ LÃI/LỖ (PROFIT FACTOR)', en: 'PROFIT FACTOR' },
  analytics_sharpe: { vi: 'CHỈ SỐ SHARPE (SHARPE RATIO)', en: 'SHARPE RATIO' },
  analytics_max_dd: { vi: 'SỤT GIẢM TỐI ĐA (MAX DRAWDOWN)', en: 'MAX DRAWDOWN' },
  analytics_gross_profit: { vi: 'Tổng Lãi (Lệnh Thắng):', en: 'Gross Profit (Winning):' },
  analytics_gross_loss: { vi: 'Tổng Lỗ (Lệnh Thua):', en: 'Gross Loss (Losing):' },
  analytics_avg_win: { vi: 'Lãi Trung Bình / Lệnh:', en: 'Average Win / Trade:' },
  analytics_avg_loss: { vi: 'Lỗ Trung Bình / Lệnh:', en: 'Average Loss / Trade:' },
  btn_create_viral_poster: { vi: '📸 TẠO POSTER KHOE LÃI & CHIA SẺ TELEGRAM (NHẬN REF)', en: '📸 GENERATE VIRAL PNL POSTER & SHARE (EARN REBATE)' },

  // Trade History Card
  trades_live_title: { vi: 'LỊCH SỬ GIAO DỊCH REALTIME (LIVE EXNESS)', en: 'REALTIME TRADE HISTORY (LIVE EXNESS)' },
  trades_no_trades: { vi: 'CHƯA CÓ LỆNH MỚI', en: 'NO RECENT TRADES' },
  trades_no_trades_sub: {
    vi: 'Thuật toán Quant AI đang rà quét thị trường Vàng (XAU/USD). Các lệnh khớp từ tài khoản Master Exness sẽ xuất hiện ngay tại đây.',
    en: 'Quant AI is scanning Gold (XAU/USD) markets. Filled orders from Master Exness accounts will appear here automatically.'
  },
  trades_not_joined: { vi: 'Chưa góp vốn', en: 'Pre-Deposit' },
  trades_share_pnl: { vi: 'Khoe Lãi', en: 'Share PnL' },

  // Viral Poster
  viral_share_title: { vi: 'POSTER KHOE LÃI SPARTAN PRO', en: 'SPARTAN PRO VIRAL PNL POSTER' },
  viral_real_profit: { vi: 'LỢI NHUẬN GIAO DỊCH THỰC NHẬN', en: 'REAL TRADING PROFIT' },
  btn_share_tg: { vi: '📲 CHIA SẺ TELEGRAM (1-CHẠM)', en: '📲 SHARE ON TELEGRAM (1-TAP)' },
  btn_download_png: { vi: '💾 Tải ảnh PNG', en: '💾 Download PNG' },
  btn_copy_ref: { vi: 'Sao chép Ref', en: 'Copy Ref Link' },

  // Admin Suite & Portal
  admin_suite_title: { vi: 'BẢN ĐIỀU KHIỂN QUẢN TRỊ VIÊN', en: 'SPARTAN MASTER ADMIN SUITE' },
  admin_portal_badge: { vi: 'CỔNG V2.0', en: 'PORTAL V2.0' },
  admin_command_center: { vi: 'TRUNG TÂM ĐIỀU HÀNH QUẢN TRỊ', en: 'MASTER ADMIN COMMAND CENTER' },
  admin_supreme_header: { vi: 'Tổng Chỉ Huy Tối Cao: @tddv2017 (ID: 494232782)', en: 'Supreme Commander: @tddv2017 (ID: 494232782)' },
  admin_dept_overview: { vi: 'TỔNG QUAN', en: 'OVERVIEW' },
  admin_dept_accounting: { vi: 'KẾ TOÁN', en: 'ACCOUNTING' },
  admin_dept_personnel: { vi: 'NHÂN SỰ', en: 'PERSONNEL' },
  admin_dept_techops: { vi: 'KỸ THUẬT', en: 'TECHOPS' },
  admin_dept_agents: { vi: 'AI AGENTS', en: 'AI AGENTS' },
  admin_dept_users: { vi: 'QL THÀNH VIÊN', en: 'USER MGMT' },
  admin_dept_txs: { vi: 'QL GIAO DỊCH', en: 'TX AUDIT' },
  admin_dept_pentest: { vi: 'LAB BẢO MẬT', en: 'PENTEST LAB' },
  admin_tvl: { vi: 'TỔNG TÀI SẢN MẠNG LƯỚI (TVL)', en: 'TOTAL NETWORK VALUE (TVL)' },
  admin_pending_queue: { vi: 'HÀNG ĐỢI CHỜ DUYỆT', en: 'PENDING QUEUE' },
  admin_refresh: { vi: 'Làm mới', en: 'Refresh' },
  admin_lock_portal: { vi: 'Khóa Cổng', en: 'Lock Portal' },
  admin_security_3fa: { vi: 'Bảo Mật 3FA', en: '3FA Security' },
  admin_change_pin: { vi: 'Đổi PIN', en: 'Change PIN' },
  admin_org_tree_title: { vi: 'SƠ ĐỒ CƠ CẤU TỔ CHỨC ĐƠN VỊ HÀNH CHÍNH', en: 'ORGANIZATION HIERARCHY TREE' },
  admin_org_tree_collapse: { vi: 'Thu gọn', en: 'Collapse' },
  admin_org_tree_expand: { vi: 'Mở rộng', en: 'Expand' },
  admin_supreme_board: { vi: 'BAN ĐIỀU HÀNH TỐI CAO (SUPREME LEADER)', en: 'SUPREME EXECUTIVE BOARD' },
  admin_enter_pin: { vi: 'NHẬP MÃ PIN QUẢN TRỊ VIÊN', en: 'ENTER MASTER ADMIN PIN' },
  admin_unlock_btn: { vi: 'MỞ KHÓA BẢN ĐIỀU KHIỂN', en: 'UNLOCK COMMAND PORTAL' },
  admin_pin_placeholder: { vi: 'Nhập mã PIN 6 số bí mật...', en: 'Enter 6-digit secret PIN...' },
  admin_pin_wrong: { vi: 'Mã PIN không chính xác! Vui lòng thử lại.', en: 'Incorrect PIN! Please try again.' }
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
    return {
      lang: 'vi' as Language,
      setLang: () => {},
      toggleLang: () => {},
      t: (key: TranslationKey) => translations[key]?.vi || String(key)
    };
  }
  return context;
};
