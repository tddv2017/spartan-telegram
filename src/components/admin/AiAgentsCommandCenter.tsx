'use client';

import React, { useState } from 'react';
import { runSpartanLedgerAI, LedgerAIResponse } from '@/lib/agents/ledgerAgent';
import { runSpartanLegionAI, LegionAIResponse } from '@/lib/agents/legionAgent';
import { runSpartanSentinelAI, SentinelAIResponse } from '@/lib/agents/sentinelAgent';
import { 
  runRedTeamScan, 
  runBlueGuardAudit, 
  runForensicsInvestigation, 
  SecurityReport 
} from '@/lib/agents/cyberSecurityAgents';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  Loader2, 
  Receipt, 
  Users, 
  Cpu, 
  Activity, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  ShieldAlert,
  Search,
  Fingerprint,
  Flame,
  Terminal,
  Shield
} from 'lucide-react';

export const AiAgentsCommandCenter: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'ADMIN_TRIO' | 'CYBER_SQUAD'>('CYBER_SQUAD');
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  // Administrative Logs
  const [ledgerLog, setLedgerLog] = useState<LedgerAIResponse | null>(null);
  const [legionLog, setLegionLog] = useState<LegionAIResponse | null>(null);
  const [sentinelLog, setSentinelLog] = useState<SentinelAIResponse | null>(null);

  // Cybersecurity Logs
  const [redTeamLog, setRedTeamLog] = useState<SecurityReport | null>(null);
  const [blueGuardLog, setBlueGuardLog] = useState<SecurityReport | null>(null);
  const [forensicsLog, setForensicsLog] = useState<SecurityReport | null>(null);
  const [forensicsTarget, setForensicsTarget] = useState<string>('494232782');

  const [expandedAgent, setExpandedAgent] = useState<string | null>('redteam');

  // Runners for Admin Trio
  const handleRunLedgerAI = async () => {
    setRunningAgent('ledger');
    try {
      const res = await runSpartanLedgerAI();
      setLedgerLog(res);
    } finally {
      setRunningAgent(null);
    }
  };

  const handleRunLegionAI = async () => {
    setRunningAgent('legion');
    try {
      const res = await runSpartanLegionAI();
      setLegionLog(res);
    } finally {
      setRunningAgent(null);
    }
  };

  const handleRunSentinelAI = async () => {
    setRunningAgent('sentinel');
    try {
      const res = await runSpartanSentinelAI();
      setSentinelLog(res);
    } finally {
      setRunningAgent(null);
    }
  };

  // Runners for Cybersecurity Squad
  const handleRunRedTeamAI = async () => {
    setRunningAgent('redteam');
    try {
      const res = await runRedTeamScan();
      setRedTeamLog(res);
    } finally {
      setRunningAgent(null);
    }
  };

  const handleRunBlueGuardAI = async () => {
    setRunningAgent('blueguard');
    try {
      const res = await runBlueGuardAudit();
      setBlueGuardLog(res);
    } finally {
      setRunningAgent(null);
    }
  };

  const handleRunForensicsAI = async () => {
    if (!forensicsTarget.trim()) return;
    setRunningAgent('forensics');
    try {
      const res = await runForensicsInvestigation(forensicsTarget);
      setForensicsLog(res);
    } finally {
      setRunningAgent(null);
    }
  };

  const handleRunAllCyberAgents = async () => {
    setRunningAgent('all_cyber');
    try {
      const [red, blue, fore] = await Promise.all([
        runRedTeamScan(),
        runBlueGuardAudit(),
        runForensicsInvestigation(forensicsTarget || '494232782')
      ]);
      setRedTeamLog(red);
      setBlueGuardLog(blue);
      setForensicsLog(fore);
    } finally {
      setRunningAgent(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Master AI Agent Header Card */}
      <div className="spartan-card rounded-3xl p-5 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black shadow-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black text-white uppercase tracking-wider">
                  TRUNG TÂM TÁC CHIẾN AI AGENT ĐỊNH CHẾ
                </h2>
                <span className="text-[9px] font-black bg-purple-600 text-white px-2 py-0.5 rounded uppercase">
                  AUTONOMOUS V2.0
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono block">
                Đội ngũ AI Agent Tự Hành: Điều hành Hành chính & Tác chiến An ninh Phòng thủ 24/7
              </span>
            </div>
          </div>

          {/* Category Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-[#0b0e17] p-1.5 rounded-2xl border border-[#1f293d]">
            <button
              onClick={() => setActiveCategory('CYBER_SQUAD')}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                activeCategory === 'CYBER_SQUAD'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ĐỘI AN NINH & BẢO MẬT (3 AI)</span>
            </button>

            <button
              onClick={() => setActiveCategory('ADMIN_TRIO')}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                activeCategory === 'ADMIN_TRIO'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>BỘ BA HÀNH CHÍNH (3 AI)</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: CYBERSECURITY AI TASK FORCE */}
      {activeCategory === 'CYBER_SQUAD' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> ĐỘI TÁC CHIẾN AN NINH & BẢO MẬT (CYBER DEFENSE TASK FORCE)
            </span>

            <button
              onClick={handleRunAllCyberAgents}
              disabled={runningAgent !== null}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#ff5500] text-black font-black text-xs uppercase flex items-center gap-1.5 hover:opacity-90 transition-all font-sans shadow-md"
            >
              {runningAgent === 'all_cyber' ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Play className="w-4 h-4 text-black" />}
              <span>QUÉT TOÀN DIỆN 3 AGENT AN NINH</span>
            </button>
          </div>

          {/* 1. Spartan RedTeam AI (Offensive Security) */}
          <div className="bg-[#0b0e17] rounded-3xl border border-red-500/40 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-black">
                  🔴
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-white uppercase">
                      1. SPARTAN REDTEAM AI (OFFENSIVE PEN-TESTER)
                    </h3>
                    <span className="text-[9px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 uppercase">
                      SĂN LỖ HỔNG
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Đóng vai hacker mũ trắng chủ động săn lùng điểm yếu & giả lập tấn công
                  </span>
                </div>
              </div>

              <button
                onClick={handleRunRedTeamAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center gap-1.5 transition-all"
              >
                {runningAgent === 'redteam' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>QUÉT LỖ HỔNG</span>
              </button>
            </div>

            {/* RedTeam Log View */}
            {redTeamLog && (
              <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                  <span className="text-gray-400 text-[10px]">ĐIỂM AN TOÀN: <strong className="text-[#00df89] text-sm">{redTeamLog.score}/100</strong></span>
                  <span className="text-[10px] font-bold text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded border border-[#00df89]/20 font-mono">
                    TRẠNG THÁI: {redTeamLog.threatLevel}
                  </span>
                </div>
                <p className="text-gray-300 font-sans text-[11px] leading-relaxed">
                  {redTeamLog.summary}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] font-bold text-amber-400 uppercase block">KẾT QUẢ RÀ SOÁT ĐỘC LẬP:</span>
                  {redTeamLog.rootCauses.map((rc, idx) => (
                    <div key={idx} className="text-[10px] text-gray-300 flex items-start gap-1.5">
                      <span>•</span>
                      <span>{rc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Spartan BlueGuard AI (Defensive SOC Architect) */}
          <div className="bg-[#0b0e17] rounded-3xl border border-cyan-500/40 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black">
                  🔵
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-white uppercase">
                      2. SPARTAN BLUEGUARD AI (DEFENSIVE FIREWALL)
                    </h3>
                    <span className="text-[9px] font-black bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase">
                      PHÒNG THỦ & SỔ CÁI
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Giám sát Sổ cái Nợ - Có 24/7, phát hiện gian lận số dư & điều phối Circuit-Breaker
                  </span>
                </div>
              </div>

              <button
                onClick={handleRunBlueGuardAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase flex items-center gap-1.5 transition-all"
              >
                {runningAgent === 'blueguard' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>KIỂM TOÁN SỔ CÁI</span>
              </button>
            </div>

            {/* BlueGuard Log View */}
            {blueGuardLog && (
              <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                  <span className="text-gray-400 text-[10px]">TOÀN VẸN SỔ CÁI: <strong className="text-[#00df89] text-sm">100% KHỚP</strong></span>
                  <span className="text-[10px] font-bold text-[#00df89] bg-[#00df89]/10 px-2 py-0.5 rounded border border-[#00df89]/20 font-mono">
                    TƯỜNG LỬA: ACTIVE
                  </span>
                </div>
                <p className="text-gray-300 font-sans text-[11px] leading-relaxed">
                  {blueGuardLog.summary}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] font-bold text-cyan-400 uppercase block">ĐỐI SOÁT DÒNG TIỀN QUỸ:</span>
                  {blueGuardLog.rootCauses.map((rc, idx) => (
                    <div key={idx} className="text-[10px] text-gray-300 flex items-start gap-1.5">
                      <span>•</span>
                      <span>{rc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Spartan Forensics AI (Root-Cause Investigation) */}
          <div className="bg-[#0b0e17] rounded-3xl border border-purple-500/40 p-4 space-y-3 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black">
                  🕵️‍♂️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-white uppercase">
                      3. SPARTAN FORENSICS AI (ROOT-CAUSE INVESTIGATOR)
                    </h3>
                    <span className="text-[9px] font-black bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase">
                      PHÁP Y SỐ
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Truy vết lịch sử giao dịch & phân tích nguyên nhân gốc rễ (5 Whys)
                  </span>
                </div>
              </div>

              {/* Target Search Input & Run Button */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={forensicsTarget}
                  onChange={(e) => setForensicsTarget(e.target.value)}
                  placeholder="Nhập ID / Username / Mã đơn..."
                  className="bg-[#131927] border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-400 w-44"
                />

                <button
                  onClick={handleRunForensicsAI}
                  disabled={runningAgent !== null}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase flex items-center gap-1.5 transition-all"
                >
                  {runningAgent === 'forensics' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>ĐIỀU TRA</span>
                </button>
              </div>
            </div>

            {/* Forensics Log View */}
            {forensicsLog && (
              <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
                  <span className="text-gray-400 text-[10px]">ĐỐI TƯỢNG GIÁM ĐỊNH: <strong className="text-white font-mono">{forensicsTarget}</strong></span>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                    KẾT LUẬN: {forensicsLog.threatLevel}
                  </span>
                </div>
                <p className="text-gray-300 font-sans text-[11px] leading-relaxed">
                  {forensicsLog.summary}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] font-bold text-purple-400 uppercase block">BÁO CÁO PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT-CAUSE DOSSIER):</span>
                  {forensicsLog.rootCauses.map((rc, idx) => (
                    <div key={idx} className="text-[10px] text-gray-300 flex items-start gap-1.5">
                      <span>•</span>
                      <span>{rc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ADMINISTRATIVE AI TRIO */}
      {activeCategory === 'ADMIN_TRIO' && (
        <div className="space-y-4">
          <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> BỘ BA AI HÀNH CHÍNH & TỔ CHỨC (ADMINISTRATIVE AI TRIO)
          </span>

          {/* 1. Spartan Ledger AI */}
          <div className="bg-[#0b0e17] rounded-3xl border border-amber-500/40 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase">1. SPARTAN LEDGER AI (KẾ TOÁN & KIỂM TOÁN)</h3>
                  <span className="text-[10px] text-gray-400 font-mono">Tự động đối soát 3 chiều, tính toán phí và quỹ trích giữ</span>
                </div>
              </div>

              <button
                onClick={handleRunLedgerAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase flex items-center gap-1.5 transition-all"
              >
                {runningAgent === 'ledger' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>CHẠY KIỂM TOÁN</span>
              </button>
            </div>

            {ledgerLog && (
              <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[10px] text-gray-400 border-b border-[#1f293d] pb-2">
                  <span>Trạng thái: <strong className="text-[#00df89]">{ledgerLog.status}</strong></span>
                  <span className="text-amber-400 font-bold">{ledgerLog.agent}</span>
                </div>
                <p className="text-gray-300 font-sans text-[11px] leading-relaxed">
                  {ledgerLog.aiCommentary}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] font-bold text-amber-400 uppercase block">KHUYẾN NGHỊ KẾ TOÁN:</span>
                  {ledgerLog.report.recommendations.map((r, i) => (
                    <div key={i} className="text-[10px] text-gray-300">• {r}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Spartan Legion AI */}
          <div className="bg-[#0b0e17] rounded-3xl border border-purple-500/40 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase">2. SPARTAN LEGION AI (NHÂN SỰ & PHÁT TRIỂN F1)</h3>
                  <span className="text-[10px] text-gray-400 font-mono">Quét mạng lưới đại lý và tự động nâng cấp cấp bậc F1</span>
                </div>
              </div>

              <button
                onClick={handleRunLegionAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase flex items-center gap-1.5 transition-all"
              >
                {runningAgent === 'legion' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>QUÉT MẠNG LƯỚI</span>
              </button>
            </div>

            {legionLog && (
              <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[10px] text-gray-400 border-b border-[#1f293d] pb-2">
                  <span>Trạng thái: <strong className="text-purple-300">{legionLog.status}</strong></span>
                  <span className="text-purple-400 font-bold">{legionLog.agent}</span>
                </div>
                <p className="text-gray-300 font-sans text-[11px] leading-relaxed">
                  {legionLog.aiCommentary}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] font-bold text-purple-400 uppercase block">HÀNH ĐỘNG ĐỀ XUẤT:</span>
                  {legionLog.report.recommendations.map((r, i) => (
                    <div key={i} className="text-[10px] text-amber-300">• {r}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Spartan Sentinel AI */}
          <div className="bg-[#0b0e17] rounded-3xl border border-cyan-500/40 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase">3. SPARTAN SENTINEL AI (RỦI RO & HẠ TẦNG)</h3>
                  <span className="text-[10px] text-gray-400 font-mono">Quét bão giá Vàng, độ trễ VPS MT5 và ngắt bot bảo vệ vốn</span>
                </div>
              </div>

              <button
                onClick={handleRunSentinelAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase flex items-center gap-1.5 transition-all"
              >
                {runningAgent === 'sentinel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>QUÉT RỦI RO</span>
              </button>
            </div>

            {sentinelLog && (
              <div className="bg-[#131927] p-3.5 rounded-2xl border border-[#1f293d] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[10px] text-gray-400 border-b border-[#1f293d] pb-2">
                  <span>Trạng thái: <strong className="text-[#00df89]">{sentinelLog.status}</strong></span>
                  <span className="text-cyan-400 font-bold">{sentinelLog.agent}</span>
                </div>
                <p className="text-gray-300 font-sans text-[11px] leading-relaxed">
                  {sentinelLog.aiCommentary}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] font-bold text-cyan-400 uppercase block">KHUYẾN NGHỊ PHÒNG THỦ:</span>
                  {sentinelLog.report.recommendations.map((r, i) => (
                    <div key={i} className="text-[10px] text-gray-300">• {r}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
