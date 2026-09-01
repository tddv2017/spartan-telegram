'use client';

import React, { useState } from 'react';
import { runSpartanLedgerAI, LedgerAIResponse } from '@/lib/agents/ledgerAgent';
import { runSpartanLegionAI, LegionAIResponse } from '@/lib/agents/legionAgent';
import { runSpartanSentinelAI, SentinelAIResponse } from '@/lib/agents/sentinelAgent';
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
  CheckCircle2
} from 'lucide-react';

export const AiAgentsCommandCenter: React.FC = () => {
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [ledgerLog, setLedgerLog] = useState<LedgerAIResponse | null>(null);
  const [legionLog, setLegionLog] = useState<LegionAIResponse | null>(null);
  const [sentinelLog, setSentinelLog] = useState<SentinelAIResponse | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>('ledger');

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

  const handleRunAllAgents = async () => {
    setRunningAgent('all');
    try {
      const [led, leg, sen] = await Promise.all([
        runSpartanLedgerAI(),
        runSpartanLegionAI(),
        runSpartanSentinelAI()
      ]);
      setLedgerLog(led);
      setLegionLog(leg);
      setSentinelLog(sen);
    } finally {
      setRunningAgent(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Master AI Agent Header Card */}
      <div className="spartan-card rounded-3xl p-5 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black text-xl shadow-md">
              🤖
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                TRUNG TÂM ĐIỀU HÀNH AI AGENT TỰ HÀNH
              </h2>
              <span className="text-[10px] text-purple-400 font-mono font-bold block">
                Hệ thống 3 Trợ Lý Trí Tuệ Nhân Tạo Chuyên Trách 24/7
              </span>
            </div>
          </div>

          <button
            onClick={handleRunAllAgents}
            disabled={runningAgent !== null}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-[#ff5500] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 shadow-md transition-all"
          >
            {runningAgent === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>CHẠY CẢ 3 AGENT</span>
          </button>
        </div>
      </div>

      {/* 3 SPECIALIZED AI AGENTS CARDS */}
      <div className="space-y-3">

        {/* 1. SPARTAN LEDGER AI (Accounting Agent) */}
        <div className="spartan-card rounded-3xl p-4 border border-cyan-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-sm font-black">
                💰
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  SPARTAN LEDGER AI
                </h3>
                <span className="text-[9px] text-cyan-400 font-mono block">
                  Trợ lý Kế toán & Đối soát Sổ cái 3 Chiều
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunLedgerAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-[10px] font-black uppercase flex items-center gap-1 transition-all"
              >
                {runningAgent === 'ledger' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span>Kiểm Toán Ngay</span>
              </button>
            </div>
          </div>

          {ledgerLog && (
            <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-2 text-xs font-mono animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-[#1f293d] pb-1.5">
                <span className="text-cyan-400 font-bold">TRẠNG THÁI: {ledgerLog.status === 'SUCCESS' ? 'HOÀN TẤT' : ledgerLog.status}</span>
                <span>{ledgerLog.report.timestamp.slice(11, 19)} UTC</span>
              </div>
              <p className="text-[11px] text-gray-200">{ledgerLog.aiCommentary}</p>
              
              {ledgerLog.report.actionsTaken.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] text-[#00df89] font-black block">HÀNH ĐỘNG ĐÃ THỰC THI:</span>
                  {ledgerLog.report.actionsTaken.map((act, i) => (
                    <div key={i} className="text-[10px] text-gray-300 flex items-start gap-1">
                      <span>•</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. SPARTAN LEGION AI (HR Agent) */}
        <div className="spartan-card rounded-3xl p-4 border border-purple-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center text-sm font-black">
                👥
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  SPARTAN LEGION AI
                </h3>
                <span className="text-[9px] text-purple-400 font-mono block">
                  Trợ lý Nhân sự & Rà soát Cấp bậc Đại lý F1
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunLegionAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-[10px] font-black uppercase flex items-center gap-1 transition-all"
              >
                {runningAgent === 'legion' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span>Đánh Giá F1</span>
              </button>
            </div>
          </div>

          {legionLog && (
            <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-2 text-xs font-mono animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-[#1f293d] pb-1.5">
                <span className="text-purple-400 font-bold">TRẠNG THÁI: {legionLog.status === 'SUCCESS' ? 'CHUẨN XÁC' : legionLog.status}</span>
                <span>{legionLog.report.timestamp.slice(11, 19)} UTC</span>
              </div>
              <p className="text-[11px] text-gray-200">{legionLog.aiCommentary}</p>
              
              {legionLog.report.actionsTaken.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] text-[#00df89] font-black block">CẤP BẬC ĐÃ THĂNG HẠNG:</span>
                  {legionLog.report.actionsTaken.map((act, i) => (
                    <div key={i} className="text-[10px] text-gray-300 flex items-start gap-1">
                      <span>•</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. SPARTAN SENTINEL AI (TechOps Agent) */}
        <div className="spartan-card rounded-3xl p-4 border border-emerald-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-sm font-black">
                ⚡
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  SPARTAN SENTINEL AI
                </h3>
                <span className="text-[9px] text-emerald-400 font-mono block">
                  Trợ lý Kỹ thuật & Quét Bão Giá Vàng (Circuit-Breaker)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunSentinelAI}
                disabled={runningAgent !== null}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-black uppercase flex items-center gap-1 transition-all"
              >
                {runningAgent === 'sentinel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span>Quét Rủi Ro</span>
              </button>
            </div>
          </div>

          {sentinelLog && (
            <div className="p-3 rounded-2xl bg-[#0b0e17] border border-[#1f293d] space-y-2 text-xs font-mono animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-[#1f293d] pb-1.5">
                <span className="text-emerald-400 font-bold">TRẠNG THÁI: {sentinelLog.status === 'OPTIMAL' ? 'HOÀN HẢO' : sentinelLog.status}</span>
                <span>{sentinelLog.report.timestamp.slice(11, 19)} UTC</span>
              </div>
              <p className="text-[11px] text-gray-200">{sentinelLog.aiCommentary}</p>
              
              {sentinelLog.report.actionsTaken.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[9px] text-[#00df89] font-black block">KIỂM TRA HẠ TẦNG:</span>
                  {sentinelLog.report.actionsTaken.map((act, i) => (
                    <div key={i} className="text-[10px] text-gray-300 flex items-start gap-1">
                      <span>•</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
