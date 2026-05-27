/**
 * @file threats-store.ts
 * @description Persistence layer for threat analysis results.
 *
 * Currently backed by an in-memory Map so the pipeline works end-to-end
 * without a live Supabase instance. Each TODO block is marked with the
 * exact Supabase client call Vardz needs to drop in.
 *
 * Thread safety note: the in-memory store is per-process and will reset
 * on server restart — acceptable for local dev and demos only.
 */

import type { ClaudeAnalysisOutput } from "../../types/claude-analysis";
import type { AnalysisState } from "./analysis-service";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A row as it would exist in the `threats` table. */
export interface ThreatRecord {
  threatId: string;
  analysisState: AnalysisState | "pending";
  threatScore: number | null;
  confidence: number | null;
  threatType: string | null;
  urgencyLevel: string | null;
  reportSummary: string | null;
  schemaVersion: string | null;
  analysedAt: string | null;
  /** Raw model output attached when state is needs_review. */
  rawModelOutput: string | null;
  /** Validation errors, JSON-stringified, when state is needs_review. */
  validationErrors: string | null;
  updatedAt: string;
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

/** In-memory store — replace with Supabase calls (see TODO blocks below). */
const store = new Map<string, ThreatRecord>();

// ─── Write Helpers ────────────────────────────────────────────────────────────

/**
 * Writes a successful analysis result to the threats table.
 *
 * @param threatId  - The threat row primary key.
 * @param analysis  - The validated ClaudeAnalysisOutput.
 * @returns The persisted ThreatRecord.
 */
export async function writeSuccessfulAnalysis(
  threatId: string,
  analysis: ClaudeAnalysisOutput
): Promise<ThreatRecord> {
  const record: ThreatRecord = {
    threatId,
    analysisState: "success",
    threatScore: analysis.threatScore,
    confidence: analysis.confidence,
    threatType: analysis.threatType,
    urgencyLevel: analysis.urgencyLevel,
    reportSummary: analysis.reportSummary,
    schemaVersion: analysis.schemaVersion,
    analysedAt: analysis.analysedAt,
    rawModelOutput: null,
    validationErrors: null,
    updatedAt: new Date().toISOString(),
  };

  // ── In-memory write ───────────────────────────────────────────────────────
  store.set(threatId, record);

  // TODO (Vardz): replace the Map write above with:
  //
  // const { error } = await supabase
  //   .from("threats")
  //   .update({
  //     analysis_state:   "success",
  //     threat_score:     analysis.threatScore,
  //     confidence:       analysis.confidence,
  //     threat_type:      analysis.threatType,
  //     urgency_level:    analysis.urgencyLevel,
  //     report_summary:   analysis.reportSummary,
  //     schema_version:   analysis.schemaVersion,
  //     analysed_at:      analysis.analysedAt,
  //     raw_model_output: null,
  //     validation_errors: null,
  //     updated_at:       new Date().toISOString(),
  //   })
  //   .eq("id", threatId);
  //
  // if (error) throw new Error(`Supabase write failed: ${error.message}`);

  return record;
}

/**
 * Marks a threat as needs_review and stores the raw model output.
 *
 * @param threatId        - The threat row primary key.
 * @param rawModelOutput  - The unparsed text from Claude.
 * @param validationErrors - Schema errors if the JSON was parsed but invalid.
 * @returns The persisted ThreatRecord.
 */
export async function writeNeedsReview(
  threatId: string,
  rawModelOutput: string | null,
  validationErrors?: string[]
): Promise<ThreatRecord> {
  const record: ThreatRecord = {
    threatId,
    analysisState: "needs_review",
    threatScore: null,
    confidence: null,
    threatType: null,
    urgencyLevel: null,
    reportSummary: null,
    schemaVersion: null,
    analysedAt: null,
    rawModelOutput: rawModelOutput ?? null,
    validationErrors: validationErrors ? JSON.stringify(validationErrors) : null,
    updatedAt: new Date().toISOString(),
  };

  // ── In-memory write ───────────────────────────────────────────────────────
  store.set(threatId, record);

  // TODO (Vardz): replace the Map write above with:
  //
  // const { error } = await supabase
  //   .from("threats")
  //   .update({
  //     analysis_state:    "needs_review",
  //     raw_model_output:  rawModelOutput,
  //     validation_errors: validationErrors ? JSON.stringify(validationErrors) : null,
  //     updated_at:        new Date().toISOString(),
  //   })
  //   .eq("id", threatId);
  //
  // if (error) throw new Error(`Supabase write failed: ${error.message}`);

  return record;
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

/**
 * Retrieves a threat record by ID from the in-memory store.
 *
 * @param threatId - The threat row primary key.
 * @returns The ThreatRecord or undefined when not found.
 */
export function getThreatRecord(threatId: string): ThreatRecord | undefined {
  // TODO (Vardz): replace with:
  //
  // const { data, error } = await supabase
  //   .from("threats")
  //   .select("*")
  //   .eq("id", threatId)
  //   .single();
  //
  // if (error) throw new Error(`Supabase read failed: ${error.message}`);
  // return data;

  return store.get(threatId);
}

/**
 * Returns all threat records (for debug/listing purposes).
 * In production this would be a paginated Supabase query with RLS.
 */
export function getAllThreatRecords(): ThreatRecord[] {
  return Array.from(store.values());
}
