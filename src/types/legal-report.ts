/**
 * @file legal-report.ts
 * @description Locked TypeScript interfaces for the cease-and-desist legal
 * report generator.
 *
 * DO NOT modify field names or types without a schema version bump and
 * sign-off from the AI Engineering lead. Downstream consumers (dashboard,
 * preview route, QA validation) depend on this contract.
 */

// ─── Enumerations ─────────────────────────────────────────────────────────────

/** Lifecycle state of a generated legal report. */
export type ReportStatus = "draft" | "review_required" | "approved";

/** Supported legal jurisdictions for the C&D notice. */
export type Jurisdiction = "US" | "EU" | "UK" | "CA" | "GLOBAL";

// ─── Request Shape ────────────────────────────────────────────────────────────

/**
 * Body sent to POST /api/takedown/generate.
 * Matches the contract documented in docs/api.md §3.
 */
export interface GenerateTakedownRequest {
  /** UUID of the threat to generate a report for. Must be in "validated" state. */
  threatId: string;
  /** UUID of the brand that owns this threat. */
  brandId: string;
  /** Legal jurisdiction governing the notice. */
  jurisdiction: Jurisdiction;
  /** Full legal name of the rights-holder entity. */
  legalEntityName: string;
  /** Contact email that will be cited in the notice. */
  contactEmail: string;
  /** When true, the legalReport will include a ceaseAndDesistNotice. */
  includeCeaseAndDesist: boolean;
  /** Override the abuse recipient email (optional; normally resolved from WHOIS). */
  recipientOverrideEmail?: string;
  /** Name of the human reviewer who will approve the report before sending. */
  reviewerName?: string;
}

// ─── Core Report Shape ────────────────────────────────────────────────────────

/**
 * LegalReport
 *
 * The machine-parseable legal report returned by Claude.
 * Every field is required. Validated by report-validator.ts before storage.
 *
 * @version 1.0.0
 */
export interface LegalReport {
  /** Short descriptive title for the report document. */
  title: string;
  /**
   * Executive summary suitable for a legal team to read at a glance.
   * Plain text, 50–1000 characters.
   */
  executiveSummary: string;
  /**
   * Ordered findings relating to the domain registrar.
   * At least one entry required.
   */
  registrarFindings: string[];
  /**
   * Ordered findings relating to the hosting provider.
   * At least one entry required.
   */
  hostFindings: string[];
  /**
   * The formal cease-and-desist notice text.
   * Included only when the request set includeCeaseAndDesist = true;
   * otherwise an empty string.
   */
  ceaseAndDesistNotice: string;
  /**
   * Recommended next steps for the legal / ops team.
   * At least one entry required.
   */
  nextSteps: string[];
}

// ─── Persisted Record ─────────────────────────────────────────────────────────

/**
 * LegalReportRecord
 *
 * The full record that is stored in memory / Supabase after a report run.
 * Extends the LegalReport with provenance, status, and debugging fields.
 */
export interface LegalReportRecord {
  /** Unique report identifier (e.g. "report_<ulid>"). */
  reportId: string;
  /** The threat this report was generated for. */
  threatId: string;
  /** The brand that owns the threat. */
  brandId: string;
  /** Jurisdiction that was supplied in the request. */
  jurisdiction: string;
  /** Abuse contact email resolved from WHOIS / request override (null if unavailable). */
  abuseEmail: string | null;
  /** Current lifecycle state of this report. */
  reportStatus: ReportStatus;
  /** ISO 8601 UTC timestamp when the report was generated. */
  generatedAt: string;
  /** Evidence snapshot referenced in the report. */
  evidence: {
    screenshotUrl: string;
    htmlSnapshotUrl: string;
    sourceUrl: string;
    /** ISO 8601 UTC timestamp when evidence was originally captured. */
    capturedAt: string;
  };
  /** The validated report content (null when reportStatus = "review_required"). */
  legalReport: LegalReport | null;
  /**
   * Raw model output kept for debugging when validation fails.
   * Present only when reportStatus = "review_required".
   */
  rawModelOutput: string | null;
  /** JSON-stringified array of schema validation errors (null when valid). */
  validationErrors: string | null;
}

// ─── API Response Shape ───────────────────────────────────────────────────────

/**
 * The HTTP response envelope for POST /api/takedown/generate.
 * Returned with 200 on success or review_required; 422 is also acceptable
 * for review_required if callers need to distinguish via status code.
 */
export type GenerateTakedownResponse = LegalReportRecord;
