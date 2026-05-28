/**
 * @file validator.ts
 * @description Runtime validator for GeminiAnalysisOutput payloads.
 *
 * Uses the JSON Schema defined in docs/samples/gemini-schema/schema.json
 * as the source of truth. The inline schema below is kept in sync manually;
 * update BOTH locations together whenever the contract changes.
 */

import type { GeminiAnalysisOutput } from "../../types/gemini-analysis";

// ─── Validation Result ────────────────────────────────────────────────────────

export interface ValidationResult {
  /** true if the payload is fully valid against the schema. */
  valid: boolean;
  /** Human-readable list of validation errors (empty when valid). */
  errors: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_THREAT_TYPES = new Set([
  "phishing",
  "malware",
  "data_exfiltration",
  "insider_threat",
  "ddos",
  "ransomware",
  "social_engineering",
  "unknown",
]);

const VALID_URGENCY_LEVELS = new Set(["critical", "high", "medium", "low"]);

const SCHEMA_VERSION_REGEX = /^\d+\.\d+\.\d+$/;
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validates an unknown value against the GeminiAnalysisOutput contract.
 *
 * This is intentionally a pure structural/semantic validator — it does NOT
 * make network calls or load the JSON Schema file at runtime, keeping the
 * hot path fast and dependency-free.
 *
 * @param raw - The value to validate (typically parsed from JSON).
 * @returns A ValidationResult with valid flag and any error messages.
 */
export function validateGeminiOutput(raw: unknown): ValidationResult {
  const errors: string[] = [];

  // Must be a non-null object
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ["Payload must be a non-null JSON object"] };
  }

  const payload = raw as Record<string, unknown>;

  // ── schemaVersion ──────────────────────────────────────────────────────────
  if (typeof payload.schemaVersion !== "string") {
    errors.push("schemaVersion must be a string");
  } else if (!SCHEMA_VERSION_REGEX.test(payload.schemaVersion)) {
    errors.push(
      `schemaVersion must match semver pattern (e.g. "1.0.0"), got "${payload.schemaVersion}"`
    );
  }

  // ── analysedAt ─────────────────────────────────────────────────────────────
  if (typeof payload.analysedAt !== "string") {
    errors.push("analysedAt must be a string");
  } else if (!ISO_8601_REGEX.test(payload.analysedAt)) {
    errors.push(
      `analysedAt must be an ISO 8601 UTC timestamp (e.g. "2026-05-26T13:00:00.000Z"), got "${payload.analysedAt}"`
    );
  }

  // ── threatScore ────────────────────────────────────────────────────────────
  if (typeof payload.threatScore !== "number") {
    errors.push("threatScore must be a number");
  } else if (payload.threatScore < 0 || payload.threatScore > 10) {
    errors.push(
      `threatScore must be between 0.00 and 10.00, got ${payload.threatScore}`
    );
  }

  // ── confidence ─────────────────────────────────────────────────────────────
  if (typeof payload.confidence !== "number") {
    errors.push("confidence must be a number");
  } else if (payload.confidence < 0 || payload.confidence > 1) {
    errors.push(
      `confidence must be between 0.00 and 1.00, got ${payload.confidence}`
    );
  }

  // ── threatType ─────────────────────────────────────────────────────────────
  if (typeof payload.threatType !== "string") {
    errors.push("threatType must be a string");
  } else if (!VALID_THREAT_TYPES.has(payload.threatType)) {
    errors.push(
      `threatType must be one of: ${[...VALID_THREAT_TYPES].join(", ")}; got "${payload.threatType}"`
    );
  }

  // ── urgencyLevel ───────────────────────────────────────────────────────────
  if (typeof payload.urgencyLevel !== "string") {
    errors.push("urgencyLevel must be a string");
  } else if (!VALID_URGENCY_LEVELS.has(payload.urgencyLevel)) {
    errors.push(
      `urgencyLevel must be one of: ${[...VALID_URGENCY_LEVELS].join(", ")}; got "${payload.urgencyLevel}"`
    );
  }

  // ── evidenceCitations ──────────────────────────────────────────────────────
  if (!Array.isArray(payload.evidenceCitations)) {
    errors.push("evidenceCitations must be an array");
  } else {
    const threatScore =
      typeof payload.threatScore === "number" ? payload.threatScore : -1;

    if (threatScore > 0 && payload.evidenceCitations.length === 0) {
      errors.push(
        "evidenceCitations must contain at least one entry when threatScore > 0"
      );
    }

    payload.evidenceCitations.forEach((citation: unknown, idx: number) => {
      if (typeof citation !== "object" || citation === null) {
        errors.push(`evidenceCitations[${idx}] must be an object`);
        return;
      }
      const c = citation as Record<string, unknown>;

      if (typeof c.source !== "string" || c.source.trim() === "") {
        errors.push(`evidenceCitations[${idx}].source must be a non-empty string`);
      }
      if (typeof c.rationale !== "string" || c.rationale.trim() === "") {
        errors.push(
          `evidenceCitations[${idx}].rationale must be a non-empty string`
        );
      }
      if (c.excerpt !== undefined) {
        if (typeof c.excerpt !== "string") {
          errors.push(`evidenceCitations[${idx}].excerpt must be a string if provided`);
        } else if (c.excerpt.length > 500) {
          errors.push(
            `evidenceCitations[${idx}].excerpt must be ≤ 500 characters, got ${c.excerpt.length}`
          );
        }
      }
    });
  }

  // ── reportSummary ──────────────────────────────────────────────────────────
  if (typeof payload.reportSummary !== "string") {
    errors.push("reportSummary must be a string");
  } else if (
    payload.reportSummary.length < 50 ||
    payload.reportSummary.length > 500
  ) {
    errors.push(
      `reportSummary must be 50–500 characters, got ${payload.reportSummary.length}`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type-guard that asserts an unknown value is a valid GeminiAnalysisOutput.
 * Throws a descriptive Error if validation fails — useful in strict pipelines.
 *
 * @param raw - The value to assert.
 * @throws Error with all validation errors joined by newline.
 */
export function assertGeminiOutput(raw: unknown): asserts raw is GeminiAnalysisOutput {
  const result = validateGeminiOutput(raw);
  if (!result.valid) {
    throw new Error(
      `GeminiAnalysisOutput validation failed:\n${result.errors.map((e) => `  • ${e}`).join("\n")}`
    );
  }
}
