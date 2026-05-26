# GhostNet AI API Specification

This document defines the application wrapper API used by the dashboard, orchestration services, and QA harness. All endpoints are server-side and should be implemented as typed route handlers with schema validation.

## Shared Types

```ts
export type ThreatType =
  | "typosquat"
  | "phishing"
  | "spoofed_social"
  | "impersonation"
  | "lookalike_domain"
  | "benign";
export type ThreatState =
  | "discovered"
  | "captured"
  | "analyzing"
  | "validated"
  | "needs_review"
  | "report_ready"
  | "closed";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type AnalysisState =
  | "pending"
  | "analyzing"
  | "validated"
  | "needs_review"
  | "report_ready";

// ThreatState tracks the lifecycle; AnalysisState tracks model validation.

export interface BrandHandle {
  platform:
    | "x"
    | "linkedin"
    | "instagram"
    | "facebook"
    | "youtube"
    | "tiktok"
    | "github"
    | "other";
  handle: string;
  url?: string;
}

export interface ThreatSummary {
  id: string;
  brandId: string;
  scanId: string;
  threatType: ThreatType;
  targetUrl: string;
  observedDomain: string;
  rawTitle: string;
  threatScore: number;
  confidenceScore: number;
  urgencyLevel: UrgencyLevel;
  threatState: ThreatState;
  analysisState: AnalysisState;
  reportStatus?: "draft" | "review_required" | "approved";
  screenshotUrl?: string;
  htmlSnapshotUrl?: string;
  firstSeenAt: string;
  updatedAt: string;
}
```

## 1. `POST /api/brands/monitor`

Registers a target brand and starts an on-demand scan.

### Request

```ts
export interface MonitorBrandRequest {
  brandName: string;
  officialDomain: string;
  primarySocialHandles: BrandHandle[];
  scanMode?: "on_demand" | "recurring";
  scanFrequencyMinutes?: number;
  notes?: string;
}
```

Example payload:

```json
{
  "brandName": "GhostNet AI",
  "officialDomain": "ghostnet.ai",
  "primarySocialHandles": [
    {
      "platform": "x",
      "handle": "ghostnetai",
      "url": "https://x.com/ghostnetai"
    },
    {
      "platform": "linkedin",
      "handle": "ghostnet-ai",
      "url": "https://www.linkedin.com/company/ghostnet-ai"
    }
  ],
  "scanMode": "on_demand",
  "scanFrequencyMinutes": 60,
  "notes": "Priority launch brand for hackathon validation."
}
```

### Successful Response

```ts
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
```

Example response:

```json
{
  "brand": {
    "id": "brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB",
    "brandName": "GhostNet AI",
    "officialDomain": "ghostnet.ai",
    "primarySocialHandles": [
      {
        "platform": "x",
        "handle": "ghostnetai",
        "url": "https://x.com/ghostnetai"
      },
      {
        "platform": "linkedin",
        "handle": "ghostnet-ai",
        "url": "https://www.linkedin.com/company/ghostnet-ai"
      }
    ],
    "status": "active",
    "createdAt": "2026-05-26T14:00:00.000Z",
    "updatedAt": "2026-05-26T14:00:00.000Z"
  },
  "scan": {
    "id": "scan_01JY0G3N1T0H7Y4V1K2D8R9S0A",
    "status": "running",
    "queuedAt": "2026-05-26T14:00:01.000Z",
    "deadlineAt": "2026-05-26T14:01:50.000Z",
    "candidateLimit": 8
  },
  "dashboard": {
    "liveThreatsUrl": "/dashboard/threats?brand=brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB",
    "brandDetailUrl": "/dashboard/brands/brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB"
  }
}
```

### Error Responses

- `400 Bad Request` when the brand domain is missing or malformed.
- `409 Conflict` when the brand already exists and the caller attempts a duplicate registration without idempotency support.
- `502 Bad Gateway` when Bright Data cannot be reached.

## 2. `GET /api/threats/live`

Returns the active threat set in JSON form and also supports streaming updates for the live dashboard.

### Query Parameters

```ts
export interface LiveThreatQuery {
  brandId?: string;
  state?: ThreatState | "all";
  since?: string;
  limit?: number;
  stream?: boolean;
}
```

### JSON Response

When requested as a normal GET, the endpoint returns the current threat snapshot.

```ts
export interface LiveThreatResponse {
  brandId?: string;
  generatedAt: string;
  activeCount: number;
  threats: ThreatSummary[];
}
```

Example response:

```json
{
  "brandId": "brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB",
  "generatedAt": "2026-05-26T14:01:12.000Z",
  "activeCount": 2,
  "threats": [
    {
      "id": "threat_01JY0G4J5F2A4X1V7N8C9D0E1F",
      "brandId": "brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB",
      "scanId": "scan_01JY0G3N1T0H7Y4V1K2D8R9S0A",
      "threatType": "typosquat",
      "targetUrl": "https://ghostnct.ai/login",
      "observedDomain": "ghostnct.ai",
      "rawTitle": "GhostNet AI Secure Login",
      "threatScore": 94,
      "confidenceScore": 0.97,
      "urgencyLevel": "critical",
      "threatState": "validated",
      "analysisState": "validated",
      "reportStatus": "review_required",
      "screenshotUrl": "https://project.supabase.co/storage/v1/object/sign/evidence/screenshots/threat_01JY0G4J5F2A4X1V7N8C9D0E1F.png?token=SIGNED_TOKEN",
      "htmlSnapshotUrl": "https://project.supabase.co/storage/v1/object/sign/evidence/html/threat_01JY0G4J5F2A4X1V7N8C9D0E1F.html?token=SIGNED_TOKEN",
      "firstSeenAt": "2026-05-26T14:00:34.000Z",
      "updatedAt": "2026-05-26T14:01:08.000Z"
    },
    {
      "id": "threat_01JY0G4K3C8T2R5M1Q7W4E6Y8U",
      "brandId": "brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB",
      "scanId": "scan_01JY0G3N1T0H7Y4V1K2D8R9S0A",
      "threatType": "spoofed_social",
      "targetUrl": "https://x.com/GhostNetAI_support",
      "observedDomain": "x.com",
      "rawTitle": "GhostNet AI Support",
      "threatScore": 81,
      "confidenceScore": 0.91,
      "urgencyLevel": "high",
      "threatState": "validated",
      "analysisState": "validated",
      "reportStatus": "draft",
      "screenshotUrl": "https://project.supabase.co/storage/v1/object/sign/evidence/screenshots/threat_01JY0G4K3C8T2R5M1Q7W4E6Y8U.png?token=SIGNED_TOKEN",
      "htmlSnapshotUrl": "https://project.supabase.co/storage/v1/object/sign/evidence/html/threat_01JY0G4K3C8T2R5M1Q7W4E6Y8U.html?token=SIGNED_TOKEN",
      "firstSeenAt": "2026-05-26T14:00:48.000Z",
      "updatedAt": "2026-05-26T14:01:11.000Z"
    }
  ]
}
```

### Stream Variant

If `stream=true` or `Accept: text/event-stream` is supplied, the endpoint should emit SSE events with the same normalized threat payloads.

Event format:

```ts
export interface LiveThreatEvent {
  event: "threat.snapshot" | "threat.created" | "threat.updated" | "threat.closed";
  timestamp: string;
  threat: ThreatSummary;
}
```

Recommended event behavior:

- send an initial `threat.snapshot` event containing the current state
- emit `threat.updated` whenever score, evidence, or analysis state changes
- emit `threat.closed` when a threat is resolved or archived

### Error Responses

- `400 Bad Request` for invalid query parameters.
- `401 Unauthorized` if the session is not permitted to view the tenant.
- `503 Service Unavailable` if the live data stream cannot be established.

## 3. `POST /api/takedown/generate`

Triggers Claude to convert a validated threat into a structured legal report.

### Request

```ts
export interface GenerateTakedownRequest {
  threatId: string;
  brandId: string;
  jurisdiction: "US" | "EU" | "UK" | "CA" | "GLOBAL";
  legalEntityName: string;
  contactEmail: string;
  includeCeaseAndDesist: boolean;
  recipientOverrideEmail?: string;
  reviewerName?: string;
}
```

Example payload:

```json
{
  "threatId": "threat_01JY0G4J5F2A4X1V7N8C9D0E1F",
  "brandId": "brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB",
  "jurisdiction": "US",
  "legalEntityName": "GhostNet AI, Inc.",
  "contactEmail": "legal@ghostnet.ai",
  "includeCeaseAndDesist": true,
  "reviewerName": "Vardz"
}
```

### Successful Response

```ts
export interface GenerateTakedownResponse {
  reportId: string;
  threatId: string;
  brandId: string;
  jurisdiction: string;
  abuseEmail: string | null;
  reportStatus: "draft" | "review_required" | "approved";
  generatedAt: string;
  evidence: {
    screenshotUrl: string;
    htmlSnapshotUrl: string;
    sourceUrl: string;
    capturedAt: string;
  };
  legalReport: {
    title: string;
    executiveSummary: string;
    registrarFindings: string[];
    hostFindings: string[];
    ceaseAndDesistNotice: string;
    nextSteps: string[];
  };
}
```

Example response:

```json
{
  "reportId": "report_01JY0G5C7P9M6D2Q4R8T1Y0U3I",
  "threatId": "threat_01JY0G4J5F2A4X1V7N8C9D0E1F",
  "brandId": "brand_01JY0G3M9P3F5Y9ZQ5K7Q0F2CB",
  "jurisdiction": "US",
  "abuseEmail": "abuse@example-registrar.com",
  "reportStatus": "review_required",
  "generatedAt": "2026-05-26T14:01:31.000Z",
  "evidence": {
    "screenshotUrl": "https://project.supabase.co/storage/v1/object/public/evidence/screenshots/threat_01JY0G4J5F2A4X1V7N8C9D0E1F.png",
    "htmlSnapshotUrl": "https://project.supabase.co/storage/v1/object/public/evidence/html/threat_01JY0G4J5F2A4X1V7N8C9D0E1F.html",
    "sourceUrl": "https://ghostnct.ai/login",
    "capturedAt": "2026-05-26T14:00:42.000Z"
  },
  "legalReport": {
    "title": "Cease and Desist Review Packet - GhostNet AI",
    "executiveSummary": "A likely impersonation site is using confusingly similar branding and a credential capture flow. Human legal review is required before submission.",
    "registrarFindings": [
      "Registrar abuse contact identified from WHOIS and RFC-compliant lookup.",
      "Domain registration date is recent relative to discovery date."
    ],
    "hostFindings": [
      "Hosting location and abuse channel identified from HTTP and DNS metadata.",
      "Evidence includes full-page screenshot and captured HTML snapshot."
    ],
    "ceaseAndDesistNotice": "This notice asserts unauthorized use of confusingly similar branding and requests immediate takedown and preservation of logs.",
    "nextSteps": [
      "Review by a human operator before external submission.",
      "Verify jurisdiction and recipient accuracy.",
      "Attach evidence files and timestamped hash manifest."
    ]
  }
}
```

### Error Responses

- `400 Bad Request` if the threat is missing or not in a reportable state.
- `404 Not Found` if the requested threat does not exist.
- `422 Unprocessable Entity` if Claude returned an invalid legal report schema.
- `503 Service Unavailable` if analysis cannot complete within the execution budget.

## Endpoint Consistency Rules

- Every endpoint must return structured JSON on error.
- Every mutation response must include timestamps.
- Every evidence-bearing response must include persistent URLs, not ephemeral local paths.
- Evidence URLs should be short-lived signed URLs in production; public URLs are acceptable only for demo environments.
- Every report generation step must remain review-gated and never auto-send external notices without an explicit human approval step.
