import { NextRequest, NextResponse } from "next/server";
import { registerBrandMonitor, type MonitorBrandRequest } from "@/lib/brand-monitor";

function isHandle(value: unknown): value is MonitorBrandRequest["primarySocialHandles"][number] {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.platform === "string" &&
    typeof candidate.handle === "string" &&
    candidate.handle.trim().length > 0 &&
    (candidate.url === undefined || typeof candidate.url === "string")
  );
}

function isRequestBody(value: unknown): value is MonitorBrandRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.brandName === "string" &&
    candidate.brandName.trim().length > 0 &&
    typeof candidate.officialDomain === "string" &&
    candidate.officialDomain.trim().length > 0 &&
    Array.isArray(candidate.primarySocialHandles) &&
    candidate.primarySocialHandles.every(isHandle)
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRequestBody(body)) {
    return NextResponse.json(
      {
        error:
          'Request body must include "brandName" (string), "officialDomain" (string), and "primarySocialHandles" (array).',
      },
      { status: 400 }
    );
  }

  const response = registerBrandMonitor(body);
  return NextResponse.json(response, { status: 202 });
}
