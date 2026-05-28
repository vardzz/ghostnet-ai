/**
 * @file threats-store.ts
 * @description Persistence layer for threat analysis results.
 *
 * Uses an in-memory Map as a local fallback and Supabase when credentials are
 * configured. This keeps the Day 2 pipeline usable in dev while making the
 * live feed and analysis writes real when a database is available.
 */

import type { GeminiAnalysisOutput } from "../../types/gemini-analysis";
import { hasSupabaseCredentials, supabaseSelectRows, supabaseUpsertRow } from "../supabase-rest";

export interface ThreatRecord {
  threatId: string;
  tenantId?: string | null;
  brandId?: string | null;
  scanId?: string | null;
  targetUrl?: string | null;
  observedDomain?: string | null;
  rawTitle?: string | null;
  rawExcerpt?: string | null;
  screenshotPath?: string | null;
  htmlSnapshotPath?: string | null;
  analysisState: "pending" | "validated" | "needs_review";
  threatScore: number | null;
  confidence: number | null;
  threatType: string | null;
  urgencyLevel: string | null;
  reportSummary: string | null;
  schemaVersion: string | null;
  analysedAt: string | null;
  rawModelOutput: string | null;
  validationErrors: string | null;
  updatedAt: string;
}

type ThreatSeed = Partial<Pick<ThreatRecord,
  | "tenantId"
  | "brandId"
  | "scanId"
  | "targetUrl"
  | "observedDomain"
  | "rawTitle"
  | "rawExcerpt"
  | "screenshotPath"
  | "htmlSnapshotPath"
>>;

type ThreatRow = {
  id: string;
  tenant_id: string | null;
  brand_id: string | null;
  scan_id: string | null;
  target_url: string | null;
  observed_domain: string | null;
  raw_title: string | null;
  raw_excerpt: string | null;
  screenshot_path: string | null;
  html_snapshot_path: string | null;
  analysis_state: "pending" | "validated" | "needs_review";
  threat_score: number | string | null;
  confidence_score: number | string | null;
  threat_type: string | null;
  urgency_level: string | null;
  report_summary: string | null;
  schema_version: string | null;
  analysed_at: string | null;
  raw_model_output: string | null;
  validation_errors: string | null;
  updated_at: string;
};

const store = new Map<string, ThreatRecord>();

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapRowToRecord(row: ThreatRow): ThreatRecord {
  return {
    threatId: row.id,
    tenantId: row.tenant_id,
    brandId: row.brand_id,
    scanId: row.scan_id,
    targetUrl: row.target_url,
    observedDomain: row.observed_domain,
    rawTitle: row.raw_title,
    rawExcerpt: row.raw_excerpt,
    screenshotPath: row.screenshot_path,
    htmlSnapshotPath: row.html_snapshot_path,
    analysisState: row.analysis_state,
    threatScore: toNumber(row.threat_score),
    confidence: toNumber(row.confidence_score),
    threatType: row.threat_type,
    urgencyLevel: row.urgency_level,
    reportSummary: row.report_summary,
    schemaVersion: row.schema_version,
    analysedAt: row.analysed_at,
    rawModelOutput: row.raw_model_output,
    validationErrors: row.validation_errors,
    updatedAt: row.updated_at,
  };
}

function mapRecordToRow(record: ThreatRecord): ThreatRow {
  return {
    id: record.threatId,
    tenant_id: record.tenantId ?? null,
    brand_id: record.brandId ?? null,
    scan_id: record.scanId ?? null,
    target_url: record.targetUrl ?? null,
    observed_domain: record.observedDomain ?? null,
    raw_title: record.rawTitle ?? null,
    raw_excerpt: record.rawExcerpt ?? null,
    screenshot_path: record.screenshotPath ?? null,
    html_snapshot_path: record.htmlSnapshotPath ?? null,
    analysis_state: record.analysisState,
    threat_score: record.threatScore,
    confidence_score: record.confidence,
    threat_type: record.threatType,
    urgency_level: record.urgencyLevel,
    report_summary: record.reportSummary,
    schema_version: record.schemaVersion,
    analysed_at: record.analysedAt,
    raw_model_output: record.rawModelOutput,
    validation_errors: record.validationErrors,
    updated_at: record.updatedAt,
  };
}

async function loadThreatRecord(threatId: string): Promise<ThreatRecord | undefined> {
  const memoryRecord = store.get(threatId);
  if (memoryRecord) {
    return memoryRecord;
  }

  if (!hasSupabaseCredentials()) {
    return undefined;
  }

  const rows = await supabaseSelectRows<ThreatRow>(
    `/rest/v1/threats?select=*&id=eq.${encodeURIComponent(threatId)}&limit=1`
  );

  return rows?.[0] ? mapRowToRecord(rows[0]) : undefined;
}

async function persistThreatRecord(record: ThreatRecord): Promise<void> {
  store.set(record.threatId, record);

  if (!hasSupabaseCredentials()) {
    return;
  }

  const previous = await loadThreatRecord(record.threatId);
  const merged: ThreatRecord = {
    ...previous,
    ...record,
    threatId: record.threatId,
    updatedAt: record.updatedAt,
  };

  if (!merged.tenantId || !merged.brandId) {
    return;
  }

  await supabaseUpsertRow<ThreatRow[]>(
    "/rest/v1/threats?on_conflict=id",
    mapRecordToRow(merged)
  );
}

export async function writeSuccessfulAnalysis(
  threatId: string,
  analysis: GeminiAnalysisOutput,
  seed?: ThreatSeed
): Promise<ThreatRecord> {
  const previous = await loadThreatRecord(threatId);
  const record: ThreatRecord = {
    threatId,
    tenantId: seed?.tenantId ?? previous?.tenantId ?? null,
    brandId: seed?.brandId ?? previous?.brandId ?? null,
    scanId: seed?.scanId ?? previous?.scanId ?? null,
    targetUrl: seed?.targetUrl ?? previous?.targetUrl ?? null,
    observedDomain: seed?.observedDomain ?? previous?.observedDomain ?? null,
    rawTitle: seed?.rawTitle ?? previous?.rawTitle ?? null,
    rawExcerpt: seed?.rawExcerpt ?? previous?.rawExcerpt ?? null,
    screenshotPath: seed?.screenshotPath ?? previous?.screenshotPath ?? null,
    htmlSnapshotPath: seed?.htmlSnapshotPath ?? previous?.htmlSnapshotPath ?? null,
    analysisState: "validated",
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

  await persistThreatRecord(record);
  return record;
}

export async function writeNeedsReview(
  threatId: string,
  rawModelOutput: string | null,
  validationErrors?: string[],
  seed?: ThreatSeed
): Promise<ThreatRecord> {
  const previous = await loadThreatRecord(threatId);
  const record: ThreatRecord = {
    threatId,
    tenantId: seed?.tenantId ?? previous?.tenantId ?? null,
    brandId: seed?.brandId ?? previous?.brandId ?? null,
    scanId: seed?.scanId ?? previous?.scanId ?? null,
    targetUrl: seed?.targetUrl ?? previous?.targetUrl ?? null,
    observedDomain: seed?.observedDomain ?? previous?.observedDomain ?? null,
    rawTitle: seed?.rawTitle ?? previous?.rawTitle ?? null,
    rawExcerpt: seed?.rawExcerpt ?? previous?.rawExcerpt ?? null,
    screenshotPath: seed?.screenshotPath ?? previous?.screenshotPath ?? null,
    htmlSnapshotPath: seed?.htmlSnapshotPath ?? previous?.htmlSnapshotPath ?? null,
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

  await persistThreatRecord(record);
  return record;
}

export async function getThreatRecord(threatId: string): Promise<ThreatRecord | undefined> {
  return loadThreatRecord(threatId);
}

export async function getAllThreatRecords(): Promise<ThreatRecord[]> {
  if (hasSupabaseCredentials()) {
    const rows = await supabaseSelectRows<ThreatRow>(
      "/rest/v1/threats?select=*&order=updated_at.desc&limit=50"
    );

    if (rows && rows.length > 0) {
      return rows.map(mapRowToRecord);
    }
  }

  return Array.from(store.values());
}
