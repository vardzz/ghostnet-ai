/**
 * @file reports-store.ts
 * @description Persistence layer for legal report records.
 *
 * Uses an in-memory Map as a local fallback and Supabase when credentials are
 * configured. Follows the same pattern as threats-store.ts.
 */

import type { LegalReport, LegalReportRecord, ReportStatus } from "../../types/legal-report";
import { hasSupabaseCredentials, supabaseSelectRows, supabaseUpsertRow } from "../supabase-rest";

// ─── Supabase Row Shape ───────────────────────────────────────────────────────

type LegalReportRow = {
  id: string;
  threat_id: string;
  brand_id: string;
  jurisdiction: string;
  abuse_email: string | null;
  report_status: ReportStatus;
  generated_at: string;
  evidence_screenshot_url: string;
  evidence_html_snapshot_url: string;
  evidence_source_url: string;
  evidence_captured_at: string;
  legal_report: string | null;       // JSON string of LegalReport
  raw_model_output: string | null;
  validation_errors: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRowToRecord(row: LegalReportRow): LegalReportRecord {
  let legalReport: LegalReport | null = null;
  if (row.legal_report) {
    try {
      legalReport = JSON.parse(row.legal_report) as LegalReport;
    } catch {
      legalReport = null;
    }
  }

  return {
    reportId: row.id,
    threatId: row.threat_id,
    brandId: row.brand_id,
    jurisdiction: row.jurisdiction,
    abuseEmail: row.abuse_email,
    reportStatus: row.report_status,
    generatedAt: row.generated_at,
    evidence: {
      screenshotUrl: row.evidence_screenshot_url,
      htmlSnapshotUrl: row.evidence_html_snapshot_url,
      sourceUrl: row.evidence_source_url,
      capturedAt: row.evidence_captured_at,
    },
    legalReport,
    rawModelOutput: row.raw_model_output,
    validationErrors: row.validation_errors,
  };
}

function mapRecordToRow(record: LegalReportRecord): LegalReportRow {
  return {
    id: record.reportId,
    threat_id: record.threatId,
    brand_id: record.brandId,
    jurisdiction: record.jurisdiction,
    abuse_email: record.abuseEmail,
    report_status: record.reportStatus,
    generated_at: record.generatedAt,
    evidence_screenshot_url: record.evidence.screenshotUrl,
    evidence_html_snapshot_url: record.evidence.htmlSnapshotUrl,
    evidence_source_url: record.evidence.sourceUrl,
    evidence_captured_at: record.evidence.capturedAt,
    legal_report: record.legalReport ? JSON.stringify(record.legalReport) : null,
    raw_model_output: record.rawModelOutput,
    validation_errors: record.validationErrors,
  };
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

// Keyed by reportId
const storeById = new Map<string, LegalReportRecord>();
// Keyed by threatId → latest reportId (a threat may have multiple report runs)
const latestByThreat = new Map<string, string>();

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function loadByReportId(reportId: string): Promise<LegalReportRecord | undefined> {
  const memRecord = storeById.get(reportId);
  if (memRecord) return memRecord;

  if (!hasSupabaseCredentials()) return undefined;

  const rows = await supabaseSelectRows<LegalReportRow>(
    `/rest/v1/legal_reports?select=*&id=eq.${encodeURIComponent(reportId)}&limit=1`
  );
  return rows?.[0] ? mapRowToRecord(rows[0]) : undefined;
}

async function persistRecord(record: LegalReportRecord): Promise<void> {
  storeById.set(record.reportId, record);
  latestByThreat.set(record.threatId, record.reportId);

  if (!hasSupabaseCredentials()) return;

  await supabaseUpsertRow<LegalReportRow[]>(
    "/rest/v1/legal_reports?on_conflict=id",
    mapRecordToRow(record)
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persists a LegalReportRecord to in-memory store and Supabase (when available).
 *
 * @param record - The complete report record to store.
 */
export async function writeLegalReport(record: LegalReportRecord): Promise<void> {
  await persistRecord(record);
}

/**
 * Retrieves a LegalReportRecord by its unique report ID.
 *
 * @param reportId - The report's unique identifier.
 * @returns The record, or undefined if not found.
 */
export async function getLegalReport(reportId: string): Promise<LegalReportRecord | undefined> {
  return loadByReportId(reportId);
}

/**
 * Retrieves the most recently generated LegalReportRecord for a given threat.
 *
 * @param threatId - The threat's unique identifier.
 * @returns The latest report record for the threat, or undefined if none exists.
 */
export async function getLegalReportByThreat(
  threatId: string
): Promise<LegalReportRecord | undefined> {
  // Check in-memory index first
  const latestReportId = latestByThreat.get(threatId);
  if (latestReportId) {
    return loadByReportId(latestReportId);
  }

  if (!hasSupabaseCredentials()) return undefined;

  // Fall back to Supabase: fetch latest by generated_at for this threat
  const rows = await supabaseSelectRows<LegalReportRow>(
    `/rest/v1/legal_reports?select=*&threat_id=eq.${encodeURIComponent(threatId)}&order=generated_at.desc&limit=1`
  );
  if (rows?.[0]) {
    const record = mapRowToRecord(rows[0]);
    // Warm the in-memory index
    storeById.set(record.reportId, record);
    latestByThreat.set(record.threatId, record.reportId);
    return record;
  }

  return undefined;
}
