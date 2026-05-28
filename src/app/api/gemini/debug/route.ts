/**
 * @file src/app/api/gemini/debug/route.ts
 * @description GET /api/gemini/debug
 *
 * Replays Kurt's docs/samples/sample-evidence.json through the full Gemini
 * analysis pipeline. Designed for local verification without any setup.
 *
 * Query parameters:
 *   ?dry=true   → prints the built prompt WITHOUT calling Gemini (safe, free)
 *   (no flag)   → makes a real Gemini API call (requires GEMINI_API_KEY)
 *
 * Example usage:
 *   # Inspect the prompt for free:
 *   curl "http://localhost:3000/api/gemini/debug?dry=true"
 *
 *   # Real end-to-end call:
 *   curl "http://localhost:3000/api/gemini/debug"
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildAnalysisPrompt,
  SYSTEM_PROMPT,
  type EvidencePacket,
} from "@/lib/gemini/prompt-template";
import { runGeminiAnalysis } from "@/lib/gemini/analysis-service";

// ─── Load Sample Evidence ─────────────────────────────────────────────────────

/**
 * Converts the flat SERP-result structure produced by Kurt's BrightData
 * prototype into the EvidencePacket shape expected by the prompt template.
 */
function loadSampleEvidence(): EvidencePacket {
  const filePath = join(process.cwd(), "docs", "samples", "sample-evidence.json");

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(
      `Could not read sample evidence file at: ${filePath}. ` +
        "Make sure you are running the dev server from the repo root."
    );
  }

  // The file produced by Kurt's scraper has shape:
  // { brandName, permutations, generatedAt, source, results: [...] }
  const serpData = JSON.parse(raw) as {
    brandName: string;
    generatedAt: string;
    source: string;
    results: Array<{
      query: string;
      title: string;
      url: string;
      snippet: string;
      rank: number;
      discoveredAt: string;
    }>;
  };

  // Map to the EvidencePacket shape the prompt-template expects
  const packet: EvidencePacket = {
    collectionId: `debug-${serpData.source}-${Date.now()}`,
    collectedAt: serpData.generatedAt,
    items: serpData.results.map((r, idx) => ({
      label: `SERP result #${r.rank} — "${r.query}"`,
      content: [
        `Title:     ${r.title}`,
        `URL:       ${r.url}`,
        `Snippet:   ${r.snippet}`,
        `Rank:      ${r.rank}`,
        `Discovered: ${r.discoveredAt}`,
      ].join("\n"),
    })),
  };

  return packet;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const isDry = req.nextUrl.searchParams.get("dry") === "true";

  // Load Kurt's sample evidence and convert to EvidencePacket
  let evidence: EvidencePacket;
  try {
    evidence = loadSampleEvidence();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  // ── DRY RUN: return the prompt without spending tokens ────────────────────
  if (isDry) {
    const userPrompt = buildAnalysisPrompt(evidence);
    return NextResponse.json({
      mode: "dry-run",
      note: "No API call was made. Remove ?dry=true to run a real analysis.",
      evidenceItemCount: evidence.items.length,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      evidence,
    });
  }

  // ── LIVE RUN: call Gemini and return full result ───────────────────────────
  const debugThreatId = `debug-${Date.now()}`;
  const result = await runGeminiAnalysis(evidence);

  return NextResponse.json({
    mode: "live",
    threatId: debugThreatId,
    evidenceItemCount: evidence.items.length,
    analysisState: result.analysisState,
    analysis: result.analysis ?? null,
    validationErrors: result.validationErrors ?? null,
    rawModelOutput: result.rawModelOutput ?? null,
    reason: result.reason ?? null,
    durationMs: result.durationMs,
  });
}
