# GhostNet AI Implementation Blueprint

## 1. Git Branching and Environment Configuration

The sprint is organized around a strict assembly line. `main` is the protected production branch, `develop` is the integration branch, and each feature domain has a single owner branch to prevent cross-contamination of work.

| Member                     | Responsibility                                              | Branch                                  |
| -------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| Vardz - Tech Lead          | Platform orchestration, schema design, CI, release control  | `main`, `develop`, `feature/infra-core` |
| Kurt - Scraping Specialist | Bright Data discovery, browser automation, evidence capture | `feature/brightdata-pipeline`           |
| Pol - AI Engineer          | Claude prompting, validation, scoring, report generation    | `feature/claude-orchestration`          |
| Charles - Frontend UI/UX   | Dashboard composition, live threat feed, evidence views     | `feature/dashboard-ui`                  |
| Zie - QA & Strategy        | Test matrix, validation criteria, release readiness         | `feature/qa-validation`                 |

### Mandatory Environment Variables

All secrets are server-side unless explicitly marked for client read-only access.

#### Bright Data

- `BRIGHTDATA_API_KEY` - master authentication token for Bright Data services
- `BRIGHTDATA_ZONE_SERP` - SERP API zone identifier
- `BRIGHTDATA_ZONE_WEB_UNLOCKER` - Web Unlocker zone identifier
- `BRIGHTDATA_ZONE_SCRAPING_BROWSER` - Scraping Browser zone identifier
- `BRIGHTDATA_PROXY_USERNAME` - proxy username for authenticated routing
- `BRIGHTDATA_PROXY_PASSWORD` - proxy password for authenticated routing
- `BRIGHTDATA_WEB_UNLOCKER_ENDPOINT` - optional override for direct fetch routing

#### Supabase

- `SUPABASE_URL` - project URL used by the server
- `SUPABASE_ANON_KEY` - low-privilege client access key if the UI needs a read-only channel
- `SUPABASE_SERVICE_ROLE_KEY` - server-only key for privileged writes
- `SUPABASE_STORAGE_BUCKET_EVIDENCE` - bucket name for screenshots and HTML snapshots
- `SUPABASE_STORAGE_BUCKET_REPORTS` - bucket name for generated legal packages

#### Claude / Anthropic

- `ANTHROPIC_API_KEY` - Claude API credential
- `ANTHROPIC_MODEL` - model name for analysis and report generation
- `ANTHROPIC_TIMEOUT_MS` - maximum request budget for one inference pass

#### Application Runtime

- `APP_BASE_URL` - canonical base URL used in report links
- `SCAN_DEADLINE_MS` - hard orchestration deadline, recommended `110000`
- `SCAN_CANDIDATE_LIMIT` - maximum suspicious targets processed per scan
- `NEXT_PUBLIC_APP_NAME` - display label used in the dashboard shell

### Environment Rules

- Never expose Bright Data credentials to the browser.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to any client bundle.
- Keep all external API calls behind server route handlers or server actions.
- Do not allow a scan to proceed if the required secrets are missing; fail at startup instead.

## 2. Step-by-Step Backend Pipeline Logic

### Step 1: Query Execution Using Bright Data SERP API

The scan begins with a narrow, high-signal search set. The goal is to find suspicious assets quickly rather than exhaustively enumerate the web.

Recommended query strategy:

1. Start with the official brand name and common misspellings.
2. Add known domain permutations, hyphenated variants, and brand + login terms.
3. Search for impersonation surfaces on social platforms and public profile pages.
4. Restrict the result window to the top results where threat likelihood is highest.

Example query families:

- brand name plus `login`, `support`, `verify`, `wallet`, `security`
- brand name plus intentional typos and omitted characters
- domain variants with alternate TLDs
- social handle lookalikes using underscores, dots, and digit substitutions

The SERP result record should be normalized into a scan candidate:

```ts
interface SearchCandidate {
  source: "serp";
  query: string;
  title: string;
  url: string;
  snippet: string;
  rank: number;
  discoveredAt: string;
}
```

Filtering rules:

- discard results that are obviously canonical and already verified
- prioritize top-ranked lookalikes and pages with login or payment language
- keep candidates that share lexical overlap with the brand or official domain
- stop adding candidates when the time budget drops below the browser capture threshold

### Step 2: Scraping Browser Automation and Safe DOM Parsing

Once a target is suspicious enough to inspect, the Scraping Browser performs a render pass and captures the visual evidence.

Required sequence:

1. Open the page in a fresh browser context.
2. Wait for network idle or a bounded stabilization timeout.
3. Capture a full-page screenshot.
4. Collect the visible title, selected headings, form labels, and prominent call-to-action text.
5. Extract a limited DOM summary rather than the full DOM tree.
6. Persist evidence immediately after capture.

The browser automation wrapper should return a compact evidence bundle:

```ts
interface BrowserEvidenceBundle {
  targetUrl: string;
  finalUrl: string;
  pageTitle: string;
  screenshotPath: string;
  htmlSnapshotPath: string;
  visibleText: string[];
  formSelectors: string[];
  capturedAt: string;
}
```

Safe parsing rules:

- Do not execute page scripts beyond what the browser naturally needs to render.
- Do not interact with credential fields except to observe their presence.
- Do not enter user data.
- Do not attempt bypass logic that would cross site boundary or authentication protections.
- Only read and store what is already public and visible.

### Step 3: Feeding Text Vectors and HTML Nodes Into Claude

Claude receives the evidence bundle after it has been normalized. The model should never be asked to infer from raw noise when a compact evidence packet is sufficient.

The wrapper should construct a prompt that includes:

- brand identity metadata
- official domain and known social handles
- candidate URL and page title
- screenshot reference
- extracted visible text
- DOM node summaries
- raw HTML excerpt only when needed for confirmation

The output schema must be strict and machine-validatable:

```ts
interface ThreatAnalysisResult {
  threatScore: number;
  confidence: number;
  threatType:
    | "typosquat"
    | "phishing"
    | "spoofed_social"
    | "impersonation"
    | "lookalike_domain"
    | "benign";
  urgencyLevel: "low" | "medium" | "high" | "critical";
  brandMatchReason: string;
  evidenceCitations: string[];
  recommendedAction: "monitor" | "escalate" | "takedown_review" | "legal_draft";
  abuseContactHint?: string;
  reportSummary: string;
}
```

Validation requirements:

- all numeric scores must stay within their expected ranges
- all enum values must match the approved vocabulary
- every analysis must cite at least one evidence source
- any parsing failure must produce a `needs_review` state instead of a fabricated score
- any parsing failure must produce a `needs_review` state instead of a fabricated score
- `benign` results should transition the threat to `closed` once evidence is stored

## 3. Strict System Error Handling

The implementation must assume every external dependency can fail, return partial data, or slow down at the worst possible moment.

### Timeout Management

The 2-minute ceiling is a hard ceiling, not an aspirational one.

Controls:

- a global scan deadline stored at job creation time
- per-request timeouts for Bright Data and Claude calls
- early exit when the remaining budget cannot support another fetch
- bounded retries with no exponential retry storm
- immediate persistence of partial evidence before returning

Recommended policy:

- one retry for transient fetch failures
- no retries for malformed responses
- no retries once the remaining runtime drops below 15 seconds

### Anti-Bot and Access Failure Handling

If Bright Data cannot retrieve a target because of rate limiting, deflection, or render failure, the scan should record the failure cleanly.

Failure states:

- `fetch_failed`
- `render_failed`
- `blocked_by_target`
- `incomplete_evidence`

The system should still persist the target metadata so the scan history is complete. A blocked target is still a useful signal.

### Supabase Transactional Fallbacks

Database writes must preserve consistency even when the process is interrupted.

Rules:

- write the brand record before starting the scan
- store evidence artifacts first, then write the threat summary
- use a transactional pattern or equivalent logical rollback markers
- if the analysis step fails after evidence is stored, retain the evidence and mark the threat as reviewable
- if a write fails after file upload, retry the database update using the same evidence paths rather than re-uploading everything

Recommended fallback status values:

- `pending_persistence`
- `evidence_saved`
- `analysis_pending`
- `analysis_failed`
- `ready_for_review`

## 4. Immediate Next-Step Action Items

Use this checklist immediately after reading the docs so the team can start building in parallel without blocking each other.

1. Create the protected branch structure and lock `main` plus `develop`.
2. Initialize the Next.js TypeScript project and install Supabase, Anthropic, and Bright Data client dependencies.
3. Define the Brand and Threat database tables plus storage buckets for evidence and reports.
4. Implement request validation schemas for all three API endpoints.
5. Build the Bright Data SERP wrapper and one browser evidence capture proof of concept.
6. Define the Claude response schema and add a strict JSON validation layer.
7. Scaffold the dashboard shell with a live threats list and evidence side panel.
8. Write the QA acceptance matrix for scoring accuracy, screenshot integrity, and timeout behavior.
9. Add environment variable validation at server startup so missing secrets fail fast.
10. Establish one sample brand, one synthetic threat, and one end-to-end happy-path test payload before integrating real data.
