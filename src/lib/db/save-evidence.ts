import { basename } from "path";
import { uploadSupabaseObject } from "../supabase-rest";

type EvidenceBundle = {
  tenantId: string;
  brandId: string;
  scanId?: string;
  targetUrl: string;
  observedDomain?: string;
  rawTitle?: string;
  rawExcerpt?: string;
  threatType: 'typosquat' | 'phishing' | 'spoofed_social' | 'impersonation' | 'lookalike_domain' | 'benign';
  htmlSnapshotPath: string;
  screenshotPath: string;
  threatScore: number;
  confidenceScore: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  analysisState: 'pending' | 'analyzing' | 'validated' | 'needs_review' | 'report_ready';
  threatState: 'discovered' | 'captured' | 'analyzing' | 'validated' | 'needs_review' | 'report_ready' | 'closed';
  legalRecommendation?: string;
};

async function uploadArtifact(
  bucket: 'evidence' | 'reports',
  basePath: string,
  sourcePath: string,
  contentType: string
): Promise<string> {
  const objectPath = `${basePath}/${basename(sourcePath)}`;

  try {
    const uploaded = await uploadSupabaseObject(bucket, objectPath, sourcePath, contentType);
    return uploaded ?? sourcePath;
  } catch {
    return sourcePath;
  }
}

export async function saveEvidence(bundle: EvidenceBundle) {
  const basePath = [bundle.tenantId, bundle.brandId, bundle.scanId ?? 'scan']
    .filter(Boolean)
    .join('/');

  const screenshotPath = await uploadArtifact('evidence', basePath, bundle.screenshotPath, 'image/png');
  const htmlSnapshotPath = await uploadArtifact(
    'evidence',
    basePath,
    bundle.htmlSnapshotPath,
    'text/html; charset=utf-8'
  );

  const row = {
    tenant_id: bundle.tenantId,
    brand_id: bundle.brandId,
    scan_id: bundle.scanId ?? null,
    threat_type: bundle.threatType,
    target_url: bundle.targetUrl,
    observed_domain: bundle.observedDomain ?? null,
    raw_title: bundle.rawTitle ?? null,
    raw_excerpt: bundle.rawExcerpt ?? null,
    html_snapshot_path: htmlSnapshotPath,
    screenshot_path: screenshotPath,
    threat_score: bundle.threatScore,
    confidence_score: bundle.confidenceScore,
    urgency_level: bundle.urgencyLevel,
    analysis_state: bundle.analysisState,
    threat_state: bundle.threatState,
    legal_recommendation: bundle.legalRecommendation ?? null,
  };

  const { hasSupabaseCredentials, supabaseUpsertRow } = await import("../supabase-rest");
  if (!hasSupabaseCredentials()) {
    return { ...row, screenshot_path: screenshotPath, html_snapshot_path: htmlSnapshotPath };
  }

  const inserted = await supabaseUpsertRow<Array<Record<string, unknown>>>(
    '/rest/v1/threats?on_conflict=id',
    row
  );

  return inserted?.[0] ?? row;
}