/**
 * @file report-validator.ts
 * @description Runtime validator for LegalReport payloads returned by Claude.
 *
 * Pure structural validator — no network calls, no file I/O.
 * Follows the same pattern as validator.ts for ClaudeAnalysisOutput.
 */

import type { LegalReport } from "../../types/legal-report";

// ─── Validation Result ─────────────────────────────────────────────────────────

export interface ReportValidationResult {
  /** true if the payload is fully valid against the LegalReport schema. */
  valid: boolean;
  /** Human-readable list of validation errors (empty when valid). */
  errors: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXECUTIVE_SUMMARY_MIN = 50;
const EXECUTIVE_SUMMARY_MAX = 1000;

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validates an unknown value against the LegalReport output contract.
 *
 * @param raw - The value to validate (typically parsed from Claude's JSON response).
 * @returns A ReportValidationResult with valid flag and any error messages.
 */
export function validateLegalReport(raw: unknown): ReportValidationResult {
  const errors: string[] = [];

  // Must be a non-null object
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ["Payload must be a non-null JSON object"] };
  }

  const payload = raw as Record<string, unknown>;

  // ── title ──────────────────────────────────────────────────────────────────
  if (typeof payload.title !== "string" || payload.title.trim() === "") {
    errors.push("title must be a non-empty string");
  }

  // ── executiveSummary ───────────────────────────────────────────────────────
  if (typeof payload.executiveSummary !== "string") {
    errors.push("executiveSummary must be a string");
  } else if (
    payload.executiveSummary.length < EXECUTIVE_SUMMARY_MIN ||
    payload.executiveSummary.length > EXECUTIVE_SUMMARY_MAX
  ) {
    errors.push(
      `executiveSummary must be ${EXECUTIVE_SUMMARY_MIN}–${EXECUTIVE_SUMMARY_MAX} characters, got ${payload.executiveSummary.length}`
    );
  }

  // ── registrarFindings ──────────────────────────────────────────────────────
  if (!Array.isArray(payload.registrarFindings)) {
    errors.push("registrarFindings must be an array");
  } else if (payload.registrarFindings.length === 0) {
    errors.push("registrarFindings must contain at least one entry");
  } else {
    payload.registrarFindings.forEach((item: unknown, idx: number) => {
      if (typeof item !== "string" || item.trim() === "") {
        errors.push(`registrarFindings[${idx}] must be a non-empty string`);
      }
    });
  }

  // ── hostFindings ───────────────────────────────────────────────────────────
  if (!Array.isArray(payload.hostFindings)) {
    errors.push("hostFindings must be an array");
  } else if (payload.hostFindings.length === 0) {
    errors.push("hostFindings must contain at least one entry");
  } else {
    payload.hostFindings.forEach((item: unknown, idx: number) => {
      if (typeof item !== "string" || item.trim() === "") {
        errors.push(`hostFindings[${idx}] must be a non-empty string`);
      }
    });
  }

  // ── ceaseAndDesistNotice ───────────────────────────────────────────────────
  // Must be a string (may be empty when not requested)
  if (typeof payload.ceaseAndDesistNotice !== "string") {
    errors.push("ceaseAndDesistNotice must be a string (empty string when not requested)");
  }

  // ── nextSteps ──────────────────────────────────────────────────────────────
  if (!Array.isArray(payload.nextSteps)) {
    errors.push("nextSteps must be an array");
  } else if (payload.nextSteps.length === 0) {
    errors.push("nextSteps must contain at least one entry");
  } else {
    payload.nextSteps.forEach((item: unknown, idx: number) => {
      if (typeof item !== "string" || item.trim() === "") {
        errors.push(`nextSteps[${idx}] must be a non-empty string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type-guard that asserts an unknown value is a valid LegalReport.
 * Throws a descriptive Error if validation fails — useful in strict pipelines.
 *
 * @param raw - The value to assert.
 * @throws Error with all validation errors joined by newline.
 */
export function assertLegalReport(raw: unknown): asserts raw is LegalReport {
  const result = validateLegalReport(raw);
  if (!result.valid) {
    throw new Error(
      `LegalReport validation failed:\n${result.errors.map((e) => `  • ${e}`).join("\n")}`
    );
  }
}
