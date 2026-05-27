/**
 * @file report-service.ts
 * @description Core service for the cease-and-desist legal report generator.
 *
 * Accepts a validated ThreatRecord and a GenerateTakedownRequest, calls Claude
 * with the locked report prompt, validates the JSON response against the
 * LegalReport schema, and returns a typed result envelope.
 *
 * This function NEVER throws — all failure modes are captured in the returned
 * ReportResult and callers decide how to surface them.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildReportPrompt, REPORT_SYSTEM_PROMPT } from "./report-prompt";
import { validateLegalReport } from "./report-validator";
import type { ThreatRecord } from "./threats-store";
import type { GenerateTakedownRequest, LegalReport, ReportStatus } from "../../types/legal-report";

// ─── Result Envelope ──────────────────────────────────────────────────────────

/** Terminal states for a single report generation run. */
export type ReportGenerationState = "success" | "review_required";

/** The envelope returned by runReportGeneration — never throws. */
export interface ReportResult {
  /** Whether the report generation succeeded and passed schema validation. */
  reportStatus: ReportStatus;
  /** Parsed and validated legal report (present only when status is "draft"). */
  legalReport?: LegalReport;
  /** Schema validation errors when status is "review_required". */
  validationErrors?: string[];
  /**
   * Raw text from Claude (present when parsing/validation failed so reviewers
   * can inspect what the model actually returned).
   */
  rawModelOutput?: string;
  /** Human-readable reason for failure (present when status is "review_required"). */
  reason?: string;
  /** Wall-clock milliseconds taken by the Claude API call. */
  durationMs: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads ANTHROPIC_TIMEOUT_MS from env, falls back to 20 000 ms.
 * Legal reports are longer than analysis — allow more time.
 */
function getTimeoutMs(): number {
  const raw = process.env.ANTHROPIC_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20_000;
}

/**
 * Attempts to extract a JSON object from a raw model reply.
 * Claude sometimes wraps JSON in markdown fences even when instructed not to.
 */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

/**
 * Derive the Claude model from env or fall back to the same model used by
 * the analysis pipeline.
 */
function getModel(): string {
  return process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022";
}

// ─── Guard ────────────────────────────────────────────────────────────────────

/**
 * Returns an error envelope when the threat is not in a reportable state.
 * A threat must be "validated" before a legal report can be generated from it.
 */
export function guardThreatState(threat: ThreatRecord): ReportResult | null {
  if (threat.analysisState !== "validated") {
    return {
      reportStatus: "review_required",
      reason: `Threat ${threat.threatId} is not in "validated" state (current: "${threat.analysisState}"). Run the analysis pipeline first.`,
      durationMs: 0,
    };
  }
  return null;
}

// ─── Main Service ─────────────────────────────────────────────────────────────

/**
 * Calls Claude with the legal report prompt, enforces the configured timeout,
 * and returns a structured ReportResult.
 *
 * @param threat   - The validated ThreatRecord fetched from the threats store.
 * @param request  - The original GenerateTakedownRequest from the API caller.
 * @param abuseEmail - Resolved abuse contact (null if unavailable).
 * @returns ReportResult — always resolves, never rejects.
 */
export async function runReportGeneration(
  threat: ThreatRecord,
  request: GenerateTakedownRequest,
  abuseEmail: string | null
): Promise<ReportResult> {
  const startedAt = Date.now();

  // ── Guard: threat must be validated ──────────────────────────────────────
  const guardError = guardThreatState(threat);
  if (guardError) return guardError;

  // ── Build the Anthropic client ────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      reportStatus: "review_required",
      reason: "ANTHROPIC_API_KEY is not configured",
      durationMs: Date.now() - startedAt,
    };
  }

  const timeoutMs = getTimeoutMs();
  const client = new Anthropic({ apiKey, timeout: timeoutMs });

  // ── Call Claude ───────────────────────────────────────────────────────────
  let rawText: string;
  try {
    const message = await client.messages.create({
      model: getModel(),
      max_tokens: 2048,
      system: REPORT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildReportPrompt({ threat, request, abuseEmail }),
        },
      ],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") {
      return {
        reportStatus: "review_required",
        reason: "Claude returned a non-text content block",
        rawModelOutput: JSON.stringify(message.content),
        durationMs: Date.now() - startedAt,
      };
    }
    rawText = block.text;
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.message.includes("timeout") ||
        err.message.includes("timed out") ||
        err.name === "APITimeoutError");

    return {
      reportStatus: "review_required",
      reason: isTimeout
        ? `Claude request timed out after ${timeoutMs}ms`
        : `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    return {
      reportStatus: "review_required",
      reason: "Claude response was not valid JSON",
      rawModelOutput: rawText,
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Validate against schema ───────────────────────────────────────────────
  const validation = validateLegalReport(parsed);
  if (!validation.valid) {
    return {
      reportStatus: "review_required",
      validationErrors: validation.errors,
      rawModelOutput: rawText,
      reason: "Claude output failed LegalReport schema validation",
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return {
    reportStatus: "draft",
    legalReport: parsed as LegalReport,
    durationMs: Date.now() - startedAt,
  };
}
