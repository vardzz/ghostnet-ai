/**
 * @file src/app/api/claude/analyze/route.ts
 * @description POST /api/claude/analyze
 *
 * Accepts a threatId and an evidence bundle, runs Claude analysis, persists
 * the result, and returns the outcome envelope.
 *
 * Request body:
 * {
 *   "threatId": "uuid-or-any-string",
 *   "evidence": { ...EvidencePacket }
 * }
 *
 * Response (200 on both success and needs_review):
 * {
 *   "threatId": "...",
 *   "analysisState": "success" | "needs_review",
 *   "analysis": { ...ClaudeAnalysisOutput } | null,
 *   "validationErrors": string[] | null,
 *   "rawModelOutput": string | null,
 *   "reason": string | null,
 *   "durationMs": number
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { runClaudeAnalysis } from "@/lib/claude/analysis-service";
import { writeSuccessfulAnalysis, writeNeedsReview } from "@/lib/claude/threats-store";
import { saveEvidence } from "@/lib/db/save-evidence";
import type { EvidencePacket } from "@/lib/claude/prompt-template";

// ─── Request Schema ───────────────────────────────────────────────────────────

interface AnalyzeRequestBody {
  threatId: string;
  evidence: EvidencePacket;
  threatContext?: {
    tenantId: string;
    brandId: string;
    scanId?: string;
    targetUrl: string;
    observedDomain?: string;
    rawTitle?: string;
    rawExcerpt?: string;
    screenshotPath: string;
    htmlSnapshotPath: string;
  };
}

function isValidBody(body: unknown): body is AnalyzeRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.threatId !== "string" || b.threatId.trim() === "") return false;
  if (typeof b.evidence !== "object" || b.evidence === null) return false;
  return true;
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

  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        error:
          'Request body must include "threatId" (string) and "evidence" (EvidencePacket object)',
      },
      { status: 400 }
    );
  }

  const { threatId, evidence } = body;
  const threatContext = body.threatContext;

  // ── Run analysis ──────────────────────────────────────────────────────────
  const result = await runClaudeAnalysis(evidence);

  // ── Persist result ────────────────────────────────────────────────────────
  if (result.analysisState === "success" && result.analysis) {
    await writeSuccessfulAnalysis(threatId, result.analysis, threatContext);
  } else {
    await writeNeedsReview(
      threatId,
      result.rawModelOutput ?? null,
      result.validationErrors,
      threatContext
    );
  }

  if (threatContext) {
    await saveEvidence({
      ...threatContext,
      threatType: result.analysis?.threatType ?? "benign",
      threatScore: result.analysis?.threatScore ?? 0,
      confidenceScore: result.analysis?.confidence ?? 0,
      urgencyLevel: result.analysis?.urgencyLevel ?? "low",
      analysisState: result.analysisState === "success" ? "validated" : "needs_review",
      threatState: result.analysisState === "success" ? "validated" : "needs_review",
      legalRecommendation: result.analysis?.reportSummary,
    });
  }

  // ── Return response ───────────────────────────────────────────────────────
  return NextResponse.json({
    threatId,
    analysisState: result.analysisState,
    analysis: result.analysis ?? null,
    validationErrors: result.validationErrors ?? null,
    rawModelOutput: result.rawModelOutput ?? null,
    reason: result.reason ?? null,
    durationMs: result.durationMs,
  });
}
