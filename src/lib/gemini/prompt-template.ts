/**
 * @file prompt-template.ts
 * @description Locked system prompt and prompt-builder for Gemini (Google AI) threat analysis.
 *
 * The SYSTEM_PROMPT is version-pinned. Any change that alters response shape
 * MUST be accompanied by a schemaVersion bump in GeminiAnalysisOutput and
 * updates to the JSON schema + sample payloads.
 */

// ─── System Prompt (locked) ───────────────────────────────────────────────────

/**
 * The invariant system prompt sent to the model on every analysis request.
 * It establishes the model's role, output contract, and hard constraints.
 */
export const SYSTEM_PROMPT = `
You are GhostNet-AI, an expert cybersecurity threat-analysis engine embedded in
a Security Operations Centre (SOC) platform. Your only job is to analyse the
evidence packet provided by the user and return a single, machine-parseable
JSON object — nothing else.

OUTPUT CONTRACT (do not deviate):
{
  "schemaVersion": "1.0.0",
  "analysedAt":        "<ISO 8601 UTC timestamp>",
  "threatScore":       <number 0.00–10.00>,
  "confidence":        <number 0.00–1.00>,
  "threatType":        "<phishing|malware|data_exfiltration|insider_threat|ddos|ransomware|social_engineering|unknown>",
  "urgencyLevel":      "<critical|high|medium|low>",
  "evidenceCitations": [
    {
      "source":    "<evidence source label>",
      "rationale": "<why this evidence matters>",
      "excerpt":   "<optional verbatim snippet ≤ 500 chars>"
    }
  ],
  "reportSummary": "<plain text, 50–500 chars>"
}

HARD RULES:
1. Return ONLY valid JSON — no markdown, no prose, no code fences.
2. Populate evidenceCitations with at least one entry when threatScore > 0.
3. reportSummary must be 50–500 plain-text characters.
4. threatScore uses exactly two decimal places (e.g. 7.43, not 7).
5. confidence uses exactly two decimal places (e.g. 0.87, not 0.9).
6. analysedAt must be the current UTC time in ISO 8601 format.
7. If the evidence is insufficient, set threatScore to 0.00 and
   threatType to "unknown" — never hallucinate threats.
`.trim();

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * EvidencePacket describes the raw intelligence gathered by the
 * BrightData pipeline before it is handed off to Gemini for analysis.
 */
export interface EvidencePacket {
  /** Unique identifier for this evidence collection run. */
  collectionId: string;
  /** ISO 8601 UTC timestamp when evidence collection started. */
  collectedAt: string;
  /** Array of raw evidence items (logs, OSINT hits, alerts, etc.). */
  items: Array<{
    /** Short human-readable label, e.g. "Firewall log #3". */
    label: string;
    /** The raw content of this evidence item. */
    content: string;
  }>;
}

/**
 * Builds the user-turn message that is appended after the system prompt.
 * Injects the serialised evidence packet and reminds the model to return
 * only valid JSON.
 *
 * @param evidence - The structured evidence packet to analyse.
 * @returns A formatted string ready to send as the user message.
 */
export function buildAnalysisPrompt(evidence: EvidencePacket): string {
  const serialised = JSON.stringify(evidence, null, 2);

  return `
Analyse the following evidence packet and return ONLY the JSON object described
in your system instructions. Do not include any text outside the JSON object.

EVIDENCE PACKET:
\`\`\`json
${serialised}
\`\`\`

Return your analysis now.
`.trim();
}
