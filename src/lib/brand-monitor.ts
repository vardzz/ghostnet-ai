import { randomUUID } from "crypto";

export type BrandHandle = {
  platform: "x" | "linkedin" | "instagram" | "facebook" | "youtube" | "tiktok" | "github" | "other";
  handle: string;
  url?: string;
};

export interface MonitorBrandRequest {
  brandName: string;
  officialDomain: string;
  primarySocialHandles: BrandHandle[];
  scanMode?: "on_demand" | "recurring";
  scanFrequencyMinutes?: number;
  notes?: string;
}

export interface MonitorBrandResponse {
  brand: {
    id: string;
    brandName: string;
    officialDomain: string;
    primarySocialHandles: BrandHandle[];
    status: "active";
    createdAt: string;
    updatedAt: string;
  };
  scan: {
    id: string;
    status: "queued" | "running";
    queuedAt: string;
    deadlineAt: string;
    candidateLimit: number;
  };
  dashboard: {
    liveThreatsUrl: string;
    brandDetailUrl: string;
  };
}

type RegisteredBrand = MonitorBrandResponse & {
  scanMode: "on_demand" | "recurring";
  notes?: string;
};

const registeredBrands = new Map<string, RegisteredBrand>();

function getCandidateLimit(): number {
  const raw = process.env.SCAN_CANDIDATE_LIMIT;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

function getDeadlineMs(): number {
  const raw = process.env.SCAN_DEADLINE_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 110_000;
}

export function registerBrandMonitor(request: MonitorBrandRequest): RegisteredBrand {
  const now = new Date().toISOString();
  const brandId = `brand_${randomUUID().replace(/-/g, "")}`;
  const scanId = `scan_${randomUUID().replace(/-/g, "")}`;
  const candidateLimit = getCandidateLimit();
  const deadlineAt = new Date(Date.now() + getDeadlineMs()).toISOString();

  const response: RegisteredBrand = {
    brand: {
      id: brandId,
      brandName: request.brandName,
      officialDomain: request.officialDomain,
      primarySocialHandles: request.primarySocialHandles,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    scan: {
      id: scanId,
      status: "queued",
      queuedAt: now,
      deadlineAt,
      candidateLimit,
    },
    dashboard: {
      liveThreatsUrl: `/dashboard/threats?brand=${brandId}`,
      brandDetailUrl: `/dashboard/brands/${brandId}`,
    },
    scanMode: request.scanMode ?? "on_demand",
    notes: request.notes,
  };

  registeredBrands.set(brandId, response);
  return response;
}

export function getRegisteredBrand(brandId: string) {
  return registeredBrands.get(brandId);
}
