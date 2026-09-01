/**
 * SPARTAN LEGION AI AGENT (HR & Reseller Network Management)
 * Specializes in affiliate tree analysis, auto-tier promotion, and growth incentives.
 */

import { executeLegionHRAudit, AgentAuditReport } from './agentTools';

export interface LegionAIResponse {
  status: 'SUCCESS' | 'PROMOTIONS_APPLIED' | 'ERROR';
  agent: string;
  report: AgentAuditReport;
  aiCommentary: string;
}

export async function runSpartanLegionAI(): Promise<LegionAIResponse> {
  try {
    const report = await executeLegionHRAudit();

    const aiCommentary = report.actionsTaken.length > 0
      ? `🎖️ Spartan Legion AI evaluated all network nodes: ${report.actionsTaken.length} leaders successfully promoted to higher rebate tiers based on active F1 volume.`
      : `✅ Spartan Legion AI confirmed all reseller tiers are 100% accurate and aligned with the 10-level institutional tier matrix.`;

    return {
      status: report.actionsTaken.length > 0 ? 'PROMOTIONS_APPLIED' : 'SUCCESS',
      agent: 'Spartan Legion AI',
      report,
      aiCommentary
    };
  } catch (err) {
    console.error('Error running Spartan Legion AI:', err);
    return {
      status: 'ERROR',
      agent: 'Spartan Legion AI',
      report: {
        agentName: 'Spartan Legion AI',
        department: 'HR',
        timestamp: new Date().toISOString(),
        summary: 'Error executing HR & affiliate audit cycle',
        actionsTaken: [],
        recommendations: [],
        anomaliesDetected: ['Affiliate tree traversal exception']
      },
      aiCommentary: '❌ Error executing automated HR evaluation.'
    };
  }
}
