/**
 * @file gemini-analysis.ts
 * @description Locked TypeScript interface for model analysis output (Gemini 2.0 Flash).
 *
 * DO NOT modify field names or types without a schema version bump and
 * sign-off from the AI Engineering lead. Downstream consumers (dashboard,
 * alerting, QA validation) depend on this contract.
 */

// ─── Enumerations ────────────────────────────────────────────────────────────

/** Canonical threat categories recognised by the GhostNet system. */
export type ThreatType =
  | "phishing"
  | "malware"
  | "data_exfiltration"
  | "insider_threat"
  | "ddos"
  | "ransomware"
  | "social_engineering"
  | "unknown";

/** How quickly the SOC team should act on a finding. */
export type UrgencyLevel = "critical" | "high" | "medium" | "low";

// ─── Supporting Types ─────────────────────────────────────────────────────────

/**
 * A single piece of evidence that informed the analysis.
 * Maps back to entries in the raw evidence packet.
 */
export interface EvidenceCitation {
  /** Human-readable label for the evidence source (e.g. "HTTP log line 42"). */
  source: string;
  /** Brief explanation of why this evidence is relevant. */
  rationale: string;
  /**
   * Optional verbatim snippet from the source (≤ 500 chars).
   * Useful for quick triage without opening raw logs.
   */
  excerpt?: string;
}

// ─── Primary Output Interface ─────────────────────────────────────────────────

/**
 * GeminiAnalysisOutput
 *
 * The complete, machine-parseable result returned by Gemini after analysing
 * an evidence packet. Every field is required unless explicitly marked
 * optional, and the schema version must be incremented on any breaking change.
 *
 * @version 1.0.0
 */
export interface GeminiAnalysisOutput {
  /**
   * Overall threat risk score.
   * Range: 0.0 (no threat) – 10.0 (maximum severity).
   * Two decimal places of precision are expected (e.g. 7.43).
   */
  threatScore: number;

  /**
   * Model's self-reported confidence in the analysis.
   * Range: 0.0 (no confidence) – 1.0 (maximum confidence).
   */
  confidence: number;

  /** Primary threat category identified in the evidence. */
  threatType: ThreatType;

  /** Recommended response urgency for the SOC. */
  urgencyLevel: UrgencyLevel;

  /**
   * Ordered list of evidence items that most influenced the verdict.
   * Must contain at least one citation when threatScore > 0.
   */
  evidenceCitations: EvidenceCitation[];

  /**
   * Executive-level summary suitable for inclusion in a security report.
   * Plain text, 50 – 500 characters.
   */
  reportSummary: string;

  /**
   * Schema version of this output contract.
   * Follows semver: "MAJOR.MINOR.PATCH".
   * Consumers should reject payloads whose MAJOR version differs from what
   * they were built against.
   */
  schemaVersion: string;

  /**
   * ISO 8601 UTC timestamp at which the analysis was produced.
   * Example: "2026-05-26T13:00:00.000Z"
   */
  analysedAt: string;
}
