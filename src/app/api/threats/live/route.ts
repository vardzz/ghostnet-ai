import { NextResponse } from "next/server";
import { getLiveThreatsFixture } from "@/lib/threats";
import { createSignedSupabaseUrl } from "@/lib/supabase-rest";
import { getAllThreatRecords } from "@/lib/claude/threats-store";

/**
 * GET /api/threats/live
 * Returns the current live-threat snapshot. The client polls this endpoint
 * every 5 s to surface real-time score / state / screenshot updates.
 */
export async function GET() {
  const persisted = await getAllThreatRecords();

  if (persisted.length === 0) {
    return NextResponse.json(getLiveThreatsFixture());
  }

  const threats = await Promise.all(
    persisted.map(async (record) => ({
      id: record.threatId,
      targetUrl: record.targetUrl ?? "",
      threatScore: record.threatScore ?? 0,
      urgencyLevel: record.urgencyLevel ?? "low",
      analysisState: record.analysisState,
      screenshotUrl: record.screenshotPath
        ? (await createSignedSupabaseUrl("evidence", record.screenshotPath)) ?? record.screenshotPath
        : undefined,
      htmlSnapshotUrl: record.htmlSnapshotPath
        ? (await createSignedSupabaseUrl("evidence", record.htmlSnapshotPath)) ?? record.htmlSnapshotPath
        : undefined,
      rawTitle: record.rawTitle ?? "",
      observedDomain: record.observedDomain ?? "",
      updatedAt: record.updatedAt,
    }))
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    activeCount: threats.length,
    threats,
  });
}
