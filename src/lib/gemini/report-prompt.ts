/**
 * @file report-prompt.ts
 * @description Locked system prompt and prompt-builder for the Claude legal
 * report generator.
 *
 * The REPORT_SYSTEM_PROMPT is version-pinned. Any change that alters the
 * response shape MUST be accompanied by updates to report-validator.ts and
 * the LegalReport type in types/legal-report.ts.
 */

import type { ThreatRecord } from "./threats-store";
import type { GenerateTakedownRequest } from "../../types/legal-report";

// ─── System Prompt (locked) ───────────────────────────────────────────────────

/**
 * The invariant system prompt sent to Claude on every report-generation request.
 * Establishes the model's role as a legal drafting assistant and fixes the
 * exact JSON output contract.
 */
export const REPORT_SYSTEM_PROMPT = `
You are GhostNet-AI Legal, an expert IP and brand-protection drafting engine
embedded in a Security Operations Centre (SOC) platform. Your only job is to
analyse the threat evidence provided and return a single, machine-parseable
JSON object — nothing else.

OUTPUT CONTRACT (do not deviate):
{
  "title": "<short descriptive report title>",
  "executiveSummary": "<plain text, 50–1000 chars>",
  "registrarFindings": [
    "<finding 1>",
    "<finding 2>"
  ],
  "hostFindings": [
    "<finding 1>",
    "<finding 2>"
  ],
  "ceaseAndDesistNotice": "<formal notice text, or empty string if not requested>",
  "nextSteps": [
    "<step 1>",
    "<step 2>"
  ]
}

HARD RULES:
1. Return ONLY valid JSON — no markdown, no prose, no code fences.
2. registrarFindings, hostFindings, and nextSteps must each contain at least
   one non-empty string entry.
3. executiveSummary must be 50–1000 plain-text characters.
4. ceaseAndDesistNotice must be a string (empty string "" when not requested).
5. Do not include any legal advice — draft only factual findings and notice
   language, and always note that human review is required before sending.
6. Never hallucinate domain registrar or hosting information; use only the
   evidence provided.
`.trim();

// ─── Context Shape ────────────────────────────────────────────────────────────

/**
 * All the data the prompt builder needs to compose the user-turn message.
 */
export interface ReportPromptContext {
  threat: ThreatRecord;
  request: GenerateTakedownRequest;
  /**
   * Resolved abuse contact email (from WHOIS lookup or request override).
   * Passed through to the prompt so Claude can reference it in the notice.
   */
  abuseEmail: string | null;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Builds the user-turn message for the legal report generation request.
 * Injects threat metadata, verified evidence citations, and request parameters
 * so Claude has everything it needs to draft the report without hallucinating.
 *
 * @param ctx - The full context for this report generation run.
 * @returns A formatted string ready to send as the Claude user message.
 */
export function buildReportPrompt(ctx: ReportPromptContext): string {
  const { threat, request, abuseEmail } = ctx;

  const evidenceCitationsText =
    threat.reportSummary
      ? `\nAnalysis Summary: ${threat.reportSummary}`
      : "";

  const abuseContact = abuseEmail
    ? `Abuse Contact: ${abuseEmail}`
    : "Abuse Contact: Not resolved — use generic registrar/host abuse address";

  const ceaseAndDesistInstruction = request.includeCeaseAndDesist
    ? 'Include a formal cease-and-desist notice in the "ceaseAndDesistNotice" field.'
    : 'Set "ceaseAndDesistNotice" to an empty string — the team did not request a C&D notice.';

  const payload = {
    threatId: threat.threatId,
    observedDomain: threat.observedDomain ?? "unknown",
    targetUrl: threat.targetUrl ?? "unknown",
    threatType: threat.threatType ?? "unknown",
    threatScore: threat.threatScore ?? 0,
    urgencyLevel: threat.urgencyLevel ?? "low",
    analysisState: threat.analysisState,
    jurisdiction: request.jurisdiction,
    legalEntityName: request.legalEntityName,
    contactEmail: request.contactEmail,
    abuseContact,
    evidenceSummary: evidenceCitationsText.trim() || "No analysis summary available.",
    analysedAt: threat.analysedAt ?? "unknown",
  };

  return `
Generate a legal report for the following confirmed brand-impersonation threat.
Return ONLY the JSON object described in your system instructions.

THREAT EVIDENCE:
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

INSTRUCTIONS:
- Jurisdiction: ${request.jurisdiction}
- Legal entity asserting rights: ${request.legalEntityName}
- Contact email for notice: ${request.contactEmail}
- ${ceaseAndDesistInstruction}
${request.reviewerName ? `- This report will be reviewed by: ${request.reviewerName}` : ""}

Always end the nextSteps array with an entry reminding the reviewer that this
report requires human sign-off before any external submission.

Return your legal report JSON now.
`.trim();
}
