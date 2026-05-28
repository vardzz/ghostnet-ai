/**
 * @file src/app/api/takedown/preview/[reportId]/route.ts
 * @description GET /api/takedown/preview/:reportId
 *
 * Returns the raw LegalReportRecord JSON for a given report ID.
 * Intended for team review of generated reports before any UI is built.
 *
 * Response (200):  LegalReportRecord (see src/types/legal-report.ts)
 * Response (404):  { error: "..." }  when the report does not exist.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLegalReport } from "@/lib/gemini/reports-store";

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { reportId } = await params;

  if (!reportId || reportId.trim() === "") {
    return NextResponse.json(
      { error: "reportId path parameter is required" },
      { status: 400 }
    );
  }

  const record = await getLegalReport(reportId);

  if (!record) {
    return NextResponse.json(
      { error: `Report not found: ${reportId}` },
      { status: 404 }
    );
  }

  return NextResponse.json(record);
}
