# GhostNet AI Architecture

## 1. System Architecture Overview

GhostNet AI is designed as a latency-controlled, evidence-first pipeline. Each scan is orchestrated to complete inside a strict sub-2-minute execution window by doing the minimum amount of synchronous work required to surface a credible threat, then persisting all heavy artifacts for async review.

```text
User Input
  |
  v
Next.js API Route /api/brands/monitor
  |
  v
Bright Data Orchestration Layer
  |-- SERP API: target discovery and anomaly enumeration
  |-- Web Unlocker: raw HTML retrieval for suspicious targets
  |-- Scraping Browser: DOM-safe rendering + screenshot capture
  |
  v
Supabase Storage + Postgres
  |-- Brands table
  |-- Threats table
  |-- Evidence bucket for screenshots and HTML snapshots
  |
  v
Claude AI Analysis Layer
  |-- evidence normalization
  |-- threat/urgency scoring
  |-- JSON schema validation
  |-- legal report generation
  |
  v
Premium Live Dashboard UI
  |-- active threat feed
  |-- score and confidence indicators
  |-- evidence viewer
  |-- cease-and-desist report export
```

### Execution Budget

The runtime budget is intentionally tight so the system behaves like a production triage engine rather than a bulk crawler:

- Discovery and search: 5 to 10 seconds
- Bright Data fetch and render: 20 to 40 seconds
- Screenshot capture and persistence: 10 to 15 seconds
- Claude analysis and validation: 10 to 20 seconds
- Database writes, event fanout, and dashboard refresh: 2 to 5 seconds
- Hard stop: 120 seconds total wall clock time

The orchestration layer must fail fast, store partial evidence, and return a structured status when the deadline is approaching rather than letting the request hang.

## 2. Core Technical Components

### 2.1 Next.js / TypeScript Backend API Routes

The backend acts as a thin orchestration boundary. It should not contain hidden business logic in page components. All operational work belongs in route handlers and server utilities.

Recommended route structure:

- `POST /api/brands/monitor`
  - Creates or updates a monitored brand record.
  - Starts a new scan job.
  - Triggers discovery against search anomalies, typosquats, and spoofed profiles.

- `GET /api/threats/live`
  - Streams or polls the current active threat set.
  - Returns hydrated threat objects with score, confidence, evidence URLs, and scan metadata.

- `POST /api/takedown/generate`
  - Promotes one threat record into a legal-grade report.
  - Produces a structured cease-and-desist package from validated evidence.

Implementation principles:

- Route handlers must be server-only.
- Every mutation should be idempotent or protected by a unique scan token.
- Request payloads should be validated with a schema layer before any external API call.
- All downstream responses should be normalized into a canonical internal threat format.
- Background work should be queued internally or executed as a bounded async job when possible, but the user-facing request must still return a deterministic scan identifier.

A clean route handler pattern:

```ts
export async function POST(request: Request) {
  const payload = await request.json();
  const validated = MonitorBrandRequestSchema.parse(payload);
  const scan = await createBrandScan(validated);
  return Response.json(scan, { status: 202 });
}
```

### 2.2 Supabase Relational Schema

The schema is centered on two primary tables and a small number of supporting fields for traceability.

#### Brands table

Purpose: store the canonical target identity being monitored.

Core columns:

- `id` - UUID primary key
- `tenant_id` - logical tenant or workspace boundary
- `brand_name` - official brand name
- `official_domain` - verified primary domain
- `primary_social_handles` - JSON array of official social identifiers
- `status` - active, paused, archived
- `created_at` - record creation time
- `updated_at` - record modification time
- `last_scan_at` - most recent scan timestamp
- `scan_frequency_minutes` - expected cadence for recurring checks

Recommended indexes:

- `tenant_id`
- `brand_name`
- `official_domain`
- `status, last_scan_at`

#### Threats table

Purpose: store every discovered suspicious target and its scored outcome.

Core columns:

- `id` - UUID primary key
- `brand_id` - foreign key to Brands
- `scan_id` - scan execution identifier
- `threat_type` - typosquat, phishing, spoofed_social, impersonation, lookalike_domain
 - `threat_type` - typosquat, phishing, spoofed_social, impersonation, lookalike_domain, benign
- `target_url` - discovered suspicious URL or profile URL
- `observed_domain` - domain extracted from the target
- `raw_title` - page or profile title
- `raw_excerpt` - search or crawl excerpt
- `html_snapshot_path` - Supabase Storage path for raw HTML
- `screenshot_path` - Supabase Storage path for visual evidence
- `threat_score` - numeric score from 0 to 100
- `confidence_score` - numeric confidence from 0.0 to 1.0
- `urgency_level` - low, medium, high, critical
- `analysis_state` - pending, analyzing, validated, needs_review, report_ready
 - `analysis_state` - pending, analyzing, validated, needs_review, report_ready
 - `threat_state` - discovered, captured, analyzing, validated, needs_review, report_ready, closed
- `legal_recommendation` - short structured outcome string
- `created_at` - time discovered
- `updated_at` - time last modified

Recommended supporting tables if the implementation grows beyond the initial sprint:

- `scan_jobs` for orchestration status and retries
- `evidence_artifacts` for multiple screenshots, OCR text, and HTTP captures
- `report_exports` for generated PDF/Markdown/JSON packages

### 2.3 Bright Data Integration Wrappers

Bright Data should be accessed through narrow wrappers, not directly inside route handlers. This keeps orchestration testable and makes future provider swaps possible.

Recommended wrappers:

- `serpClient`
  - Executes query templates for brand name variants, domain lookalikes, and targeted keyword combinations.
  - Returns structured search results with source, ranking, title, URL, and snippet.

- `webUnlockerClient`
  - Retrieves the raw HTML of suspicious sites that resist normal fetches.
  - Keeps the original HTML intact for evidence preservation.

- `scrapingBrowserClient`
  - Opens the target in a render-capable browser context.
  - Waits for the page to settle.
  - Captures the full viewport screenshot.
  - Extracts DOM nodes that matter for the threat model.

The wrappers must normalize Bright Data responses into a common shape:

```ts
interface CrawledEvidence {
  source: "serp" | "web_unlocker" | "scraping_browser";
  url: string;
  fetchedAt: string;
  html?: string;
  screenshotUrl?: string;
  title?: string;
  domSummary?: string[];
  headers?: Record<string, string>;
}
```

## 3. Data Flow and State Management

### 3.1 End-to-End Evidence Flow

1. The user submits a brand and its official identity via the API.
2. The brand record is persisted in Supabase and a scan job is created.
3. Bright Data SERP API searches for suspicious variants and high-signal anomalies.
4. The orchestration layer filters results into a short candidate list.
5. Web Unlocker retrieves raw HTML for candidates that need evidence-grade capture.
6. Scraping Browser renders the target, waits for stability, and captures the screenshot.
7. Raw HTML and screenshots are stored in Supabase Storage with immutable filenames.
8. Metadata is inserted or updated in the Threats table.
9. Claude receives the normalized evidence package and returns a strict JSON analysis object.
10. The JSON parser validates the response, computes the final threat state, and updates the record.
11. The dashboard polls or subscribes to live changes and reflects the new status immediately.

### 3.2 Raw HTML and Screenshot Handling

Raw HTML must be treated as evidence, not as display content. The pipeline should store:

- the original HTML snapshot
- a rendered screenshot
- the source URL
- the fetch timestamp
- a checksum of the artifact
- the scan identifier that produced it

This preserves the chain of custody and allows legal review to inspect exactly what was observed at crawl time.

### 3.3 Claude JSON Validation Parser

Claude is used as a reasoning layer, but the application must never trust free-form text directly. The response should conform to a locked JSON schema that includes:

- `threatScore`
- `confidence`
- `threatType`
- `brandMatchReason`
- `evidenceCitations`
- `recommendedAction`
- `abuseContactHints`
 - `abuseContactHint`
- `reportSummary`

The parser should reject any response that:

- omits a required field
- returns a number outside the accepted range
- includes untrusted executable markup
- lacks evidence references

If validation fails, the system should fall back to a compact review state rather than fabricating a result.

### 3.4 Frontend Real-Time State

The dashboard must feel live without creating heavy client state complexity. The preferred pattern is:

- server renders the initial list of active threats
- a polling or SSE channel refreshes only the mutable fields
- the client applies minimal deltas instead of replacing the entire list
- screenshot URLs and analysis labels update in place

The canonical frontend state for each threat should include:

- identity fields: `id`, `brandId`, `targetUrl`, `threatType`
- scoring fields: `threatScore`, `confidenceScore`, `urgencyLevel`
- evidence fields: `screenshotUrl`, `htmlSnapshotPath`, `firstSeenAt`
- workflow fields: `analysisState`, `reportState`, `reviewState`
 - workflow fields: `threatState`, `analysisState`, `reportStatus`

### 3.5 State Transitions

A threat should move through a clear state machine:

- `discovered` - found by Bright Data
- `captured` - screenshot and HTML saved
- `analyzing` - queued for Claude reasoning
- `validated` - passed JSON validation
- `needs_review` - partial confidence or missing legal signal
- `report_ready` - ready for legal export
- `closed` - resolved or archived

This state machine keeps the dashboard coherent and prevents the UI from showing stale or contradictory statuses.

## 4. Sub-2-Minute Operational Design

To stay inside the execution window, the system must prioritize a single high-confidence pass over exhaustive crawling.

Practical constraints:

- cap candidate discovery to a bounded top-N result set
- skip low-value results once enough signal is collected
- enforce timeouts on every external request
- persist artifacts as soon as they are created
- return partial output when the deadline is close

The result is a system that behaves like a rapid-response threat triage appliance, not a general-purpose web crawler.
