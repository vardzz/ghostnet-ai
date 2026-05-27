import { NextRequest, NextResponse } from "next/server";

interface GenerateReportPayload {
  threatId?: string;
  context?: Record<string, unknown>;
}

/**
 * POST /api/takedown/generate
 * Accepts a threat ID / context and (eventually) triggers downstream
 * report-generation logic. Returns a job reference for polling.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as GenerateReportPayload;

  if (!body.threatId && !body.context) {
    return NextResponse.json(
      { error: "threatId or context is required" },
      { status: 400 }
    );
  }

  // Stub: in production this would enqueue a background job.
  const jobId = `job_${Date.now()}`;

  return NextResponse.json({
    success: true,
    jobId,
    message: `Takedown report queued for threat ${body.threatId ?? "batch"}.`,
  });
}
