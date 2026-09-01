/**
 * SPARTAN LEDGER AI AGENT (Accounting & Financial Audit)
 * Specializes in 3-way invoice reconciliation, deposit verification, and commission ledger audit.
 */

import { executeLedgerAudit, AgentAuditReport } from './agentTools';

export interface LedgerAIResponse {
  status: 'SUCCESS' | 'FLAGGED' | 'ERROR';
  agent: string;
  report: AgentAuditReport;
  aiCommentary: string;
}

export async function runSpartanLedgerAI(): Promise<LedgerAIResponse> {
  try {
    const report = await executeLedgerAudit();

    const aiCommentary = report.anomaliesDetected.length > 0
      ? `⚠️ Spartan Ledger AI identified ${report.anomaliesDetected.length} anomalous transactions requiring human review. All verified standard orders have been reconciled.`
      : `✅ Spartan Ledger AI completed 3-way financial audit. Inflows and fee structures (9% deposit / 19% withdraw) match 100% with cryptographic ledger.`;

    return {
      status: report.anomaliesDetected.length > 0 ? 'FLAGGED' : 'SUCCESS',
      agent: 'Spartan Ledger AI',
      report,
      aiCommentary
    };
  } catch (err) {
    console.error('Error running Spartan Ledger AI:', err);
    return {
      status: 'ERROR',
      agent: 'Spartan Ledger AI',
      report: {
        agentName: 'Spartan Ledger AI',
        department: 'ACCOUNTING',
        timestamp: new Date().toISOString(),
        summary: 'Error executing ledger audit cycle',
        actionsTaken: [],
        recommendations: ['Check Firebase REST connectivity'],
        anomaliesDetected: ['Audit cycle timeout']
      },
      aiCommentary: '❌ Error executing automated financial audit.'
    };
  }
}
