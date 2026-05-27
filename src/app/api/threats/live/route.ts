import { NextResponse } from "next/server";
import { getLiveThreatsFixture } from "@/lib/threats";

/**
 * GET /api/threats/live
 * Returns the current live-threat snapshot. The client polls this endpoint
 * every 5 s to surface real-time score / state / screenshot updates.
 */
export async function GET() {
  const data = getLiveThreatsFixture();
  return NextResponse.json(data);
}
