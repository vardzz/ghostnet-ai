/**
 * @file src/app/api/takedown/generate/route.ts
 * @description POST /api/takedown/generate
 *
 * Accepts a validated GenerateTakedownRequest, fetches the threat record,
 * calls Claude to generate a structured legal report, validates the response,
 * persists the LegalReportRecord, and returns the full response envelope.
 *
 * Request body: GenerateTakedownRequest (see src/types/legal-report.ts)
 *
 * Response (200 on success / "draft", 422 on "review_required"):
 *   LegalReportRecord — see src/types/legal-report.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getThreatRecord } from "@/lib/gemini/threats-store";
import { runReportGeneration } from "@/lib/gemini/report-service";
import { writeLegalReport } from "@/lib/gemini/reports-store";
import type {
  GenerateTakedownRequest,
  Jurisdiction,
  LegalReportRecord,
} from "@/types/legal-report";

// ─── Request Validation ───────────────────────────────────────────────────────

const VALID_JURISDICTIONS = new Set<Jurisdiction>(["US", "EU", "UK", "CA", "GLOBAL"]);

function isValidRequest(body: unknown): body is GenerateTakedownRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.threatId !== "string" || b.threatId.trim() === "") return false;
  if (typeof b.brandId !== "string" || b.brandId.trim() === "") return false;
  if (typeof b.jurisdiction !== "string" || !VALID_JURISDICTIONS.has(b.jurisdiction as Jurisdiction)) return false;
  if (typeof b.legalEntityName !== "string" || b.legalEntityName.trim() === "") return false;
  if (typeof b.contactEmail !== "string" || b.contactEmail.trim() === "") return false;
  if (typeof b.includeCeaseAndDesist !== "boolean") return false;
  return true;
}

// ─── Simple Report ID generator ───────────────────────────────────────────────

function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (!isValidRequest(body)) {
    return NextResponse.json(
      {
        error:
          "Request body must include: threatId, brandId, jurisdiction (US|EU|UK|CA|GLOBAL), " +
          "legalEntityName, contactEmail, and includeCeaseAndDesist (boolean)",
      },
      { status: 400 }
    );
  }

  const request = body;

  // ── Fetch threat ──────────────────────────────────────────────────────────
  const threat = await getThreatRecord(request.threatId);

  if (!threat) {
    return NextResponse.json(
      { error: `Threat not found: ${request.threatId}` },
      { status: 404 }
    );
  }

  if (threat.analysisState !== "validated") {
    return NextResponse.json(
      {
        error: `Threat "${request.threatId}" is not in "validated" state (current: "${threat.analysisState}"). ` +
               `Run POST /api/gemini/analyze first.`,
      },
      { status: 400 }
    );
  }

  // ── Resolve abuse email ───────────────────────────────────────────────────
  // Use the caller-supplied override when provided; otherwise fall back to null
  // (real WHOIS lookup would be added here in production).
  const abuseEmail = request.recipientOverrideEmail ?? null;

  // ── Run report generation ─────────────────────────────────────────────────
  const result = await runReportGeneration(threat, request, abuseEmail);

  // ── Build the persisted record ────────────────────────────────────────────
  const reportId = generateReportId();
  const generatedAt = new Date().toISOString();

  const record: LegalReportRecord = {
    reportId,
    threatId: threat.threatId,
    brandId: request.brandId,
    jurisdiction: request.jurisdiction,
    abuseEmail,
    reportStatus: result.reportStatus,
    generatedAt,
    evidence: {
      screenshotUrl: threat.screenshotPath ?? "",
      htmlSnapshotUrl: threat.htmlSnapshotPath ?? "",
      sourceUrl: threat.targetUrl ?? "",
      capturedAt: threat.analysedAt ?? generatedAt,
    },
    legalReport: result.legalReport ?? null,
    rawModelOutput: result.rawModelOutput ?? null,
    validationErrors: result.validationErrors
      ? JSON.stringify(result.validationErrors)
      : null,
  };

  // ── Persist ───────────────────────────────────────────────────────────────
  await writeLegalReport(record);

  // ── Return response ───────────────────────────────────────────────────────
  // 200 for "draft" (success), 422 for "review_required" so callers can
  // distinguish without inspecting the body.
  const httpStatus = result.reportStatus === "draft" ? 200 : 422;

  return NextResponse.json(record, { status: httpStatus });
}
