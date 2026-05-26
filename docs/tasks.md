# GhostNet AI 4-Day Sprint Task Plan (Clear Instructions + AI Prompts)

This sprint is a tightly orchestrated assembly line. Each day has explicit, strict instructions written for a junior developer and a copy-paste AI assistant prompt for the assigned member. Follow the step-by-step actions exactly, and use the AI prompt when blocked or to accelerate routine tasks. Keep branches small and focused; open a PR early and iterate.

---

## Day 1 - Foundation and Contract Lock

Goal: Establish repo structure, lock API contracts, and produce minimal prototypes so parallel work can begin.

| Status | Task Name                                    | Assigned Member & Branch                                    | Dependencies                           | Target Deliverable                                                               |
| ------ | -------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| [X]    | Project bootstrap and protected branch setup | Vardz - Tech Lead / `main`, `develop`, `feature/infra-core` | None                                   | Repo structure, branch protection, baseline Next.js app, shared coding standards |
| [X]    | Bright Data discovery prototype              | Kurt - Scraping Specialist / `feature/brightdata-pipeline`  | Brand definition from product scope    | SERP query prototype returning top suspicious results                            |
| [ ]    | Claude schema and scoring contract           | Pol - AI Engineer / `feature/claude-orchestration`          | Evidence shape from scraping prototype | Strict JSON schema for threat analysis and report output                         |
| [ ]    | Dashboard shell and navigation skeleton      | Charles - Frontend UI/UX / `feature/dashboard-ui`           | API contract draft                     | Visual shell with brand panel, live threat list, and evidence drawer             |
| [X]    | QA matrix and sprint acceptance rules        | Zie - QA & Strategy / `feature/qa-validation`               | Product scope and target architecture  | Test checklist, release criteria, and pass/fail thresholds                       |

### Per-Task Instructions and AI Prompts (Day 1)

#### Task: Project bootstrap and protected branch setup

- Assigned: Vardz (Tech Lead) — `feature/infra-core`
- Strict instructions (junior-level):
  1.  Create `feature/infra-core` from `develop` locally: `git checkout -b feature/infra-core develop`.
  2.  Initialize a minimal Next.js TypeScript app: `npx create-next-app@latest --ts` in the repo root if not present.
  3.  Add `docs/` if missing and copy sprint docs into it.
  4.  Create branch protection rules in the repo settings (require PR reviews for `main` and `develop`).
  5.  Commit and push the branch; open a PR targeting `develop` with a clear checklist.
  6.  Add CI lint and a minimal `check-environment` script to fail fast if env vars are missing.
  7.  Share the PR link in the team Slack and tag Kurt, Pol, Charles, and Zie for visibility.

AI Prompt (copy/paste):

```
You are an engineering assistant helping a junior developer bootstrap this repo for a 4-day sprint.
Step-by-step: create a `feature/infra-core` branch from `develop`; initialize a minimal Next.js TypeScript app if absent; add `docs/` folder and commit current sprint docs; add a small CI check that validates presence of required env vars; create a PR to `develop` with a checklist of items (branch protection, CI, docs). Provide the exact shell commands and a short PR description the junior dev can paste into GitHub. If a step fails, explain one clear next remediation.
```

#### Task: Bright Data discovery prototype

- Assigned: Kurt (Scraping Specialist) — `feature/brightdata-pipeline`
- Strict instructions (junior-level):
  1.  Create branch from `develop`: `git checkout -b feature/brightdata-pipeline develop`.
  2.  Implement a minimal SERP client wrapper that accepts brand name and permutations and returns top-N results (N=8).
  3.  Log structured JSON with fields: `query`, `title`, `url`, `snippet`, `rank`, `discoveredAt`.
  4.  Add a small script `scripts/serp-sample.ts` that runs a sample query and writes `sample-evidence.json` to `/tmp` or `docs/samples`.
  5.  Push the branch and open a PR; attach `sample-evidence.json` for Pol to consume.

AI Prompt (copy/paste):

```
You are an AI assistant guiding a junior scraping engineer. Build a Bright Data SERP wrapper prototype: provide TypeScript code that queries a SERP endpoint, normalizes results to the JSON schema (`query`, `title`, `url`, `snippet`, `rank`, `discoveredAt`), and saves the top 8 results to `docs/samples/sample-evidence.json`. Include error handling and a 10s timeout. Return the code and sample CLI commands to run it locally.
```

#### Task: Claude schema and scoring contract

- Assigned: Pol (AI Engineer) — `feature/claude-orchestration`
- Strict instructions (junior-level):
  1.  Branch from `develop`: `git checkout -b feature/claude-orchestration develop`.
  2.  Draft a locked TypeScript interface for analysis output, including `threatScore`, `confidence`, `threatType`, `urgencyLevel`, `evidenceCitations`, and `reportSummary`.
  3.  Create a JSON Schema validator and example valid/invalid payloads under `docs/samples/claude-schema/`.
  4.  Write a minimal prompt template that injects the evidence packet and requests machine-parseable JSON.
  5.  Commit and open a PR; tag Kurt to validate sample evidence passes your schema.

AI Prompt (copy/paste):

```
You are an AI engineer assistant. Produce a strict TypeScript interface and JSON Schema for a Claude analysis result (fields: threatScore [0-100], confidence [0.0-1.0], threatType enum, urgencyLevel enum, evidenceCitations array, reportSummary string). Provide two example JSON responses (valid and invalid) and a short prompt template that asks Claude to return only this JSON. Explain how to validate Claude output and what to do if validation fails.
```

#### Task: Dashboard shell and navigation skeleton

- Assigned: Charles (Frontend UI/UX) — `feature/dashboard-ui`
- Strict instructions (junior-level):
  1.  Branch: `git checkout -b feature/dashboard-ui develop`.
  2.  Scaffold a simple React/Tailwind shell with a left nav and a main content area.
  3.  Add a `Threats` page that accepts static JSON and renders a table with columns: `score`, `urgency`, `targetUrl`, `state`.
  4.  Add an `Evidence` slide-over that shows `screenshotUrl` and `htmlSnapshotUrl` links.
  5.  Use mock API responses stored in `docs/samples/live-threats.json` to validate layout.
  6.  Push and create a PR linking to the mock fixtures for backend wiring.

AI Prompt (copy/paste):

```
You are a frontend helper. Provide clear steps and example React (+TypeScript +Tailwind) code to scaffold a dashboard shell (left nav and main area), a `Threats` list bound to a static JSON fixture, and an evidence slide-over showing screenshot and HTML links. Include the minimal component files and how to run the dev server. Keep code concise and copy-pasteable.
```

#### Task: QA matrix and sprint acceptance rules

- Assigned: Zie (QA & Strategy) — `feature/qa-validation`
- Strict instructions (junior-level):
  1.  Branch: `git checkout -b feature/qa-validation develop`.
  2.  Draft an acceptance checklist covering: happy-path scan, blocked-fetch handling, schema validation failures, report gating, and tenant isolation.
  3.  Produce at least 6 automated smoke test cases (can be scripted Node.js Jest tests hitting mocked endpoints).
  4.  Store tests under `tests/smoke/` and provide run instructions.
  5.  Share the checklist and sample tests in the PR for Day 1 artifacts.

AI Prompt (copy/paste):

```
You are a QA automation assistant. Create a concise acceptance checklist for a 4-day sprint covering: successful scan, blocked fetch, invalid Claude output, evidence integrity, RLS tenant isolation, and report review gating. Provide simple Jest test skeletons for 3 smoke tests and commands to run them locally. Output the checklist and code ready to paste into files.
```

---

## Day 2 - Pipeline Integration

Goal: Connect discovery -> capture -> analysis -> UI with concrete artifacts and a live feed prototype.

| Status | Task Name                                   | Assigned Member & Branch                                   | Dependencies                   | Target Deliverable                                            |
| ------ | ------------------------------------------- | ---------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| [ ]    | Supabase schema and evidence storage wiring | Vardz - Tech Lead / `feature/infra-core`                   | Day 1 contract lock            | Brands and Threats tables plus evidence buckets and RLS rules |
| [ ]    | Scraping Browser capture flow               | Kurt - Scraping Specialist / `feature/brightdata-pipeline` | SERP prototype                 | Full-page screenshot capture with safe DOM summaries          |
| [ ]    | Claude threat analysis implementation       | Pol - AI Engineer / `feature/claude-orchestration`         | Evidence packet from Kurt      | Scoring pipeline that returns validated JSON analysis         |
| [ ]    | Live threat feed UI integration             | Charles - Frontend UI/UX / `feature/dashboard-ui`          | API contract and mock payloads | Dashboard list bound to live threat data and evidence links   |
| [ ]    | Test scaffolding and E2E checkpoints        | Zie - QA & Strategy / `feature/qa-validation`              | Day 1 interfaces               | Automated smoke tests for one brand, one threat, one report   |

### Per-Task Instructions and AI Prompts (Day 2)

#### Task: Supabase schema and evidence storage wiring

- Assigned: Vardz — `feature/infra-core`
- Strict instructions (junior-level):
  1.  Create `brands` and `threats` tables with columns described in `docs/architecture.md`.
  2.  Create storage buckets `evidence` and `reports` and set RLS policies for tenant isolation.
  3.  Implement a simple server utility `db/saveEvidence()` that accepts an evidence bundle and writes artifact paths atomically.
  4.  Add migration files and a `scripts/setup-db.sh` to bootstrap local dev schema.
  5.  Commit and open PR; provide sample SQL to insert a test brand and test threat.

AI Prompt (copy/paste):

```
You are a DB migration assistant. Provide SQL and a small Node.js migration script to create `brands` and `threats` tables (with UUID PKs, tenant_id FK, and fields for screenshot_path and html_snapshot_path), create `evidence` and `reports` buckets in Supabase, and add example RLS policy SQL that restricts reads to the owner tenant. Include a `setup-db.sh` with commands to run the migrations locally.
```

#### Task: Scraping Browser capture flow

- Assigned: Kurt — `feature/brightdata-pipeline`
- Strict instructions (junior-level):
  1.  Implement a browser capture that loads a candidate URL in a fresh context.
  2.  Wait for `networkidle` or a 10s stabilization timeout.
  3.  Capture a full-page screenshot and save a UTF-8 HTML snapshot.
  4.  Extract a short list of visible texts and form selectors (limit to 20 items).
  5.  Upload the screenshot and HTML snapshot to Supabase storage using the service role key.
  6.  Return a normalized evidence bundle to the caller and persist a record via `db/saveEvidence()`.

AI Prompt (copy/paste):

```
You are a browser automation assistant. Provide TypeScript code using Playwright (or Puppeteer) that opens a URL in a new context, waits for network idle or 10s, takes a full-page screenshot, saves the HTML snapshot, extracts visible headings and form selectors (max 20), and uploads both files to Supabase storage. Show how to call the function and handle timeouts and blocked pages.
```

#### Task: Claude threat analysis implementation

- Assigned: Pol — `feature/claude-orchestration`
- Strict instructions (junior-level):
  1.  Implement a service that accepts the normalized evidence bundle and calls Claude with the locked prompt template.
  2.  Ensure the request times out at `ANTHROPIC_TIMEOUT_MS` and parse only JSON responses.
  3.  Validate the JSON against the schema; if invalid, mark the threat `needs_review` and attach the raw model output.
  4.  On success, write scores and state transitions to `threats` table.
  5.  Provide a debug endpoint that replays the sample evidence through the pipeline.

AI Prompt (copy/paste):

```
You are an AI integration assistant. Write a TypeScript service that takes an evidence bundle, calls Claude with the provided prompt template, enforces a 15s timeout, and validates the returned JSON against the schema. If validation fails, set `analysis_state` to `needs_review`; if success, write the parsed values (threatScore, confidence, etc.) to the database. Provide error handling and a replay endpoint for testing.
```

#### Task: Live threat feed UI integration

- Assigned: Charles — `feature/dashboard-ui`
- Strict instructions (junior-level):
  1.  Implement a service call to `GET /api/threats/live` and bind it to the `Threats` list.
  2.  Use polling with 5s interval or SSE if backend supports it.
  3.  On item update, patch only the changed fields (score, state, screenshot URL) to avoid repaint thrash.
  4.  Add a review button that opens the evidence slide-over and a `Generate Report` button that calls `POST /api/takedown/generate`.
  5.  Add visual badges for `critical/high/medium/low` urgency.

AI Prompt (copy/paste):

```
You are a frontend integration assistant. Provide concise React hooks and example code to poll `/api/threats/live` every 5s (or subscribe via SSE), update list items with deltas, and implement a `Review` action that opens an evidence slide-over and triggers the report generation endpoint. Include sample responses and UI mapping for urgency badges.
```

#### Task: Test scaffolding and E2E checkpoints

- Assigned: Zie — `feature/qa-validation`
- Strict instructions (junior-level):
  1.  Create smoke tests that assert: brand registration, a simple scan lifecycle (queued -> captured -> analyzed), and report generation gating.
  2.  Use mocked services for Bright Data and Claude to simulate success and failure cases.
  3.  Add a CI job that runs the smoke tests on PRs.
  4.  Document how to run tests locally.

AI Prompt (copy/paste):

```
You are a QA automation assistant. Provide Jest-based test skeletons for: brand registration flow, scan lifecycle (mocking external calls), and report generation (including model failure path). Include setup instructions and sample mocks for Bright Data and Claude.
```

---

## Day 3 - Hardening and Legal Workflow

Goal: Add robustness (timeouts, retries), finalize failure taxonomy, and produce human-reviewable legal drafts.

| Status | Task Name                                       | Assigned Member & Branch                                   | Dependencies                 | Target Deliverable                                                       |
| ------ | ----------------------------------------------- | ---------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| [ ]    | Deadline enforcement and retry policy           | Vardz - Tech Lead / `feature/infra-core`                   | Integration paths from Day 2 | Hard timeout controls and bounded retry rules                            |
| [ ]    | Anti-bot failure handling and fallback capture  | Kurt - Scraping Specialist / `feature/brightdata-pipeline` | Browser capture flow         | Clean failure states for blocked or partially rendered targets           |
| [ ]    | Cease-and-desist report generator               | Pol - AI Engineer / `feature/claude-orchestration`         | Validated threat records     | Structured legal draft with evidence citations and abuse contact hints   |
| [ ]    | Evidence viewer and report action panel         | Charles - Frontend UI/UX / `feature/dashboard-ui`          | Threat and report fixtures   | UI for screenshot review, report preview, and manual approval            |
| [ ]    | Validation suite expansion and release criteria | Zie - QA & Strategy / `feature/qa-validation`              | End-to-end flows from Day 2  | Regression tests covering timeout, evidence integrity, and report gating |

### Per-Task Instructions and AI Prompts (Day 3)

#### Task: Deadline enforcement and retry policy

- Assigned: Vardz — `feature/infra-core`
- Strict instructions (junior-level):
  1.  Implement a global scan deadline using `SCAN_DEADLINE_MS` and pass a `deadlineAt` timestamp with each job.
  2.  Cancel or short-circuit any downstream calls when remaining time < 15s.
  3.  Add one retry for transient fetch failures; ensure no retry if remaining budget is low.
  4.  Write unit tests for deadline behavior and simulate low-budget cancellation.

AI Prompt (copy/paste):

```
You are a reliability engineer assistant. Provide code snippets showing how to enforce a global scan deadline in Node.js: attach `deadlineAt` to the job, propagate a cancellable signal to HTTP and browser calls, and implement the "no retry if <15s" rule. Include test ideas and an example of handling an in-flight timeout.
```

#### Task: Anti-bot failure handling and fallback capture

- Assigned: Kurt — `feature/brightdata-pipeline`
- Strict instructions (junior-level):
  1.  Define explicit failure categories: `fetch_failed`, `render_failed`, `blocked_by_target`, `incomplete_evidence`.
  2.  When blocked, capture headers, status code, and a short console log snippet; still persist the record with `analysis_state='needs_review'`.
  3.  Add heuristics to retry with Web Unlocker only once.
  4.  Add unit/integration tests that simulate returns for each failure category.

AI Prompt (copy/paste):

```
You are an anti-bot handling assistant. Provide a strict implementation plan and TypeScript code to classify capture errors into `fetch_failed`, `render_failed`, `blocked_by_target`, and `incomplete_evidence`. Show how to capture headers/status and persist a minimal evidence record. Provide tests simulating each failure.
```

#### Task: Cease-and-desist report generator

- Assigned: Pol — `feature/claude-orchestration`
- Strict instructions (junior-level):
  1.  Build the report generator that accepts a validated `threatId` and produces the `legalReport` object.
  2.  Ensure the generator uses only verified evidence references (screenshot path, HTML snapshot path, WHOIS/registrar hints).
  3.  The output must pass JSON schema validation; otherwise produce a `reportStatus: review_required` and attach raw output.
  4.  Create a preview route that returns the generated report JSON for manual review.

AI Prompt (copy/paste):

```
You are an assistant building a takedown report generator. Produce a TypeScript function that takes `threatId`, fetches evidence and metadata from the DB, calls Claude with a tight prompt to produce a `legalReport` schema, validates the response, and stores the report. If validation fails, set `reportStatus` to `review_required`. Provide a preview endpoint example.
```

#### Task: Evidence viewer and report action panel

- Assigned: Charles — `feature/dashboard-ui`
- Strict instructions (junior-level):
  1.  Implement evidence viewer UI to preview screenshot and rendered HTML snapshot safely (iframe sandboxed for HTML previews).
  2.  Add `Approve Report` and `Request Changes` review actions; wire them to API calls that change `reportStatus`.
  3.  Ensure `Approve Report` requires the reviewer to enter their name and a brief justification.
  4.  Add optimistic UI updates and fallback on API error.

AI Prompt (copy/paste):

```
You are a frontend assistant. Provide React component code for an evidence viewer that safely displays a screenshot and a sandboxed HTML preview, plus `Approve Report` and `Request Changes` actions requiring reviewer metadata. Include code to call the appropriate endpoints and handle optimistic updates and error rollback.
```

#### Task: Validation suite expansion and release criteria

- Assigned: Zie — `feature/qa-validation`
- Strict instructions (junior-level):
  1.  Expand tests to include deadline-abort, anti-bot scenarios, and schema validation failures.
  2.  Add regression tests ensuring RLS prevents cross-tenant access.
  3.  Define pass criteria for the release candidate: 90% of smoke/regression tests green, no critical defects.
  4.  Prepare a short runbook for reproducing any failing scenario locally.

AI Prompt (copy/paste):

```
You are a QA strategist assistant. Provide Jest test cases and guidance to validate deadline cancellation, anti-bot failure handling, Claude schema validation errors, and RLS tenant isolation. Provide a runbook template for reproducing and troubleshooting failing tests locally.
```

---

## Day 4 - Stabilization and Launch Readiness

Goal: Final polish, tuning, and release readiness — ensure the demo is stable and all handoffs are complete.

| Status | Task Name                                     | Assigned Member & Branch                                    | Dependencies                     | Target Deliverable                                                  |
| ------ | --------------------------------------------- | ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| [ ]    | Final integration polish and release gate     | Vardz - Tech Lead / `main`, `develop`, `feature/infra-core` | All feature branches merged      | Release candidate with clean build and deploy sequence              |
| [ ]    | Search coverage tuning and edge-case sampling | Kurt - Scraping Specialist / `feature/brightdata-pipeline`  | Production-like fixtures         | Finalized discovery patterns with safe limits and tuned filters     |
| [ ]    | Prompt optimization and JSON validation sweep | Pol - AI Engineer / `feature/claude-orchestration`          | Realistic evidence samples       | Lower-failure-rate analysis prompt and validation guardrail set     |
| [ ]    | UI responsiveness and presentation polish     | Charles - Frontend UI/UX / `feature/dashboard-ui`           | Stable live feed and report flow | Demo-ready dashboard with mobile-safe layout and clear states       |
| [ ]    | Final QA, launch checklist, and handoff notes | Zie - QA & Strategy / `feature/qa-validation`               | Full integrated build            | Sign-off document, known risks log, and demo verification checklist |

### Per-Task Instructions and AI Prompts (Day 4)

#### Task: Final integration polish and release gate

- Assigned: Vardz — `main`, `develop`, `feature/infra-core`
- Strict instructions (junior-level):
  1.  Merge `feature/*` branches into `develop`, run full CI, and fix critical failures.
  2.  Produce a release candidate PR from `develop` to `main` with a deployment checklist.
  3.  Verify environment variables and secrets are present in the deployment environment.
  4.  Tag Zie to perform final sign-off tests.

AI Prompt (copy/paste):

```
You are a release engineer assistant. Provide a clear checklist and exact CLI commands to merge feature branches into `develop`, run CI steps, create a release candidate PR to `main`, and validate environment variables for production deployment. Include a short checklist the junior dev can follow to verify readiness.
```

#### Task: Search coverage tuning and edge-case sampling

- Assigned: Kurt — `feature/brightdata-pipeline`
- Strict instructions (junior-level):
  1.  Run the discovery prototype against a curated set of 20 brand variants and collect failure modes.
  2.  Adjust query templates to reduce false positives and cap candidate limits.
  3.  Produce a short report listing common false-positive patterns and suggested filter rules.
  4.  Share filtered sample JSON with Pol and Zie.

AI Prompt (copy/paste):

```
You are a data tuning assistant. Run the SERP discovery prototype against a set of 20 curated brand variants, aggregate results, identify false-positive patterns, and propose precise filter rules (regex or heuristics) to reduce noise. Output a JSON report and a short action list for engineers.
```

#### Task: Prompt optimization and JSON validation sweep

- Assigned: Pol — `feature/claude-orchestration`
- Strict instructions (junior-level):
  1.  Re-run the Claude prompt against the curated samples from Kurt.
  2.  Tune the prompt to reduce schema validation failures (emphasize `return only JSON` and give strict numeric ranges).
  3.  Create a short mapping document of common failure modes and prompt fixes.
  4.  Commit prompt versions and link them in the PR.

AI Prompt (copy/paste):

```
You are an LLM prompt optimization assistant. Take the provided evidence examples and produce a prompt variant that minimizes non-JSON replies and out-of-range numeric values. Provide the revised prompt, tests showing before/after validation pass rates, and a short changelog entry.
```

#### Task: UI responsiveness and presentation polish

- Assigned: Charles — `feature/dashboard-ui`
- Strict instructions (junior-level):
  1.  Run UX checks on mobile and desktop; fix any layout breakages.
  2.  Ensure images are lazy-loaded and the evidence slide-over is accessible.
  3.  Add a short demo script and keyboard-shortcut mappings for reviewers.
  4.  Create a final PR and tag Vardz and Zie for visual acceptance.

AI Prompt (copy/paste):

```
You are a frontend QA assistant. Provide a checklist and sample code to ensure responsive layout, lazy-loading of evidence images, accessible slide-over, and keyboard shortcuts for the main review actions. Include a short demo script the reviewer can run in 3 minutes.
```

#### Task: Final QA, launch checklist, and handoff notes

- Assigned: Zie — `feature/qa-validation`
- Strict instructions (junior-level):
  1.  Run the full test suite and the smoke tests against the release candidate.
  2.  Verify tenant isolation, evidence integrity, deadline behavior, and report gating.
  3.  Produce the sign-off document with known risks and reproduction steps.
  4.  Deliver the sign-off to Vardz and request final deployment.

AI Prompt (copy/paste):

```
You are a QA release assistant. Provide a final sign-off template and a step-by-step runbook for verifying tenant isolation, evidence integrity, deadline enforcement, and report gating. Include sample commands to run the test suite and how to collect logs for failed cases.
```

---

## Operating Rules for the Whole Sprint (Clear and Strict)

- Always open a PR early with a working stub; do not wait to finish a feature before creating a PR.
- Each handoff must include: a sample artifact (JSON), a short usage note (one paragraph), and the branch/PR link.
- Keep PRs small (under 300 lines where possible) and label by owner and day (e.g., `Member2-Day2`).
- Use the provided AI prompts for routine tasks; always review and human-approve generated code before merging.
- Daily standup: each member posts a short status update in Slack with `branch`, `blocking_issues`, and `handoff_urls`.

---

End of updated sprint plan. Follow the prompts and strict instructions for predictable, parallel progress.
