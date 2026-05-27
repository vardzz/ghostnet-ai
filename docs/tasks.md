# GhostNet AI 4-Day Sprint Task Plan (Clear Instructions + AI Prompts)

This sprint is a tightly orchestrated assembly line. Each day has explicit, strict instructions written for a junior developer and a copy-paste AI assistant prompt for the assigned member. Follow the step-by-step actions exactly, and use the AI prompt when blocked or to accelerate routine tasks. Keep branches small and focused; open a PR early and iterate.

---

## Day 1 - Foundation and Contract Lock

Goal: Establish repo structure, lock API contracts, and produce minimal prototypes so parallel work can begin.

| Status | Task Name                                    | Assigned Member & Branch                                    | Dependencies                           | Target Deliverable                                                               |
| ------ | -------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| [X]    | Project bootstrap and protected branch setup | Vardz - Tech Lead / `main`, `develop`, `feature/infra-core` | None                                   | Repo structure, branch protection, baseline Next.js app, shared coding standards |
| [X]    | Bright Data discovery prototype              | Kurt - Scraping Specialist / `feature/brightdata-pipeline`  | Brand definition from product scope    | SERP query prototype returning top suspicious results                            |
| [x]    | Claude schema and scoring contract           | Zie - AI Engineer / `feature/claude-orchestration`          | Evidence shape from scraping prototype | Strict JSON schema for threat analysis and report output                         |
| [X]    | Dashboard shell and navigation skeleton      | Charles - Frontend UI/UX / `feature/dashboard-ui`           | API contract draft                     | Visual shell with brand panel, live threat list, and evidence drawer             |
| [X]    | QA matrix and sprint acceptance rules        | Pol - QA & Strategy / `feature/qa-validation`               | Product scope and target architecture  | Test checklist, release criteria, and pass/fail thresholds                       |

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

## Day 2 - Pipeline Integration

Goal: Connect discovery -> capture -> analysis -> UI with concrete artifacts and a live feed prototype.

| Status | Task Name                                   | Assigned Member & Branch                                   | Dependencies                   | Target Deliverable                                            |
| ------ | ------------------------------------------- | ---------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| [X]    | Supabase schema and evidence storage wiring | Vardz - Tech Lead / `feature/infra-core`                   | Day 1 contract lock            | Brands and Threats tables plus evidence buckets and RLS rules |
| [X]    | Scraping Browser capture flow               | Kurt - Scraping Specialist / `feature/brightdata-pipeline` | SERP prototype                 | Full-page screenshot capture with safe DOM summaries          |
| [X]    | Claude threat analysis implementation       | Zie - AI Engineer / `feature/claude-orchestration`         | Evidence packet from Kurt      | Scoring pipeline that returns validated JSON analysis         |
| [X]    | Live threat feed UI integration             | Charles - Frontend UI/UX / `feature/dashboard-ui`          | API contract and mock payloads | Dashboard list bound to live threat data and evidence links   |
| [X]    | Test scaffolding and E2E checkpoints        | Pol - QA & Strategy / `feature/qa-validation`              | Day 1 interfaces               | Automated smoke tests for one brand, one threat, one report   |

### Per-Task Instructions and AI Prompts (Day 2)

#### Task: Supabase schema and evidence storage wiring

- Assigned: Vardz (Tech Lead) — `feature/infra-core`
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

- Assigned: Kurt (Scraping Specialist) — `feature/brightdata-pipeline`
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

- Assigned: Zie (AI Engineer) — `feature/claude-orchestration`
- Strict instructions (junior-level):
  1.  Implement a service that accepts the normalized evidence bundle and calls Claude with the locked prompt template.
  2.  Ensure the request times out at `ANTHROPIC_TIMEOUT_MS` and parse only JSON responses.
  3.  Validate the JSON against the schema; if invalid, mark the threat `needs_review` and attach the raw model output.
  4.  On success, write scores and state transitions to `threats` table.
  5.  Provide a debug endpoint that replays the sample evidence through the pipeline.

AI Prompt (copy/paste):

```
You are an AI integration assistant. Write a TypeScript service that takes an evidence bundle, calls Claude with the provided prompt template, enforces a 15s timeout, and validates the returned JSON against the schema. If validation fails, set `analysisState` to `needs_review`; if success, write the parsed values (threatScore, confidenceScore, etc.) to the database. Provide error handling and a replay endpoint for testing.
```

#### Task: Live threat feed UI integration

- Assigned: Charles (Frontend UI/UX) — `feature/dashboard-ui`
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

- Assigned: Pol (QA and Strategy) — `feature/qa-validation`
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

## Day 3 - Hardening and MVP Path Lock

Goal: Finish the core backend and legal drafting path so scans are reliable and the report can be generated in JSON for human review.

| Status | Task Name                                       | Assigned Member & Branch                                   | Dependencies                 | Target Deliverable                                                       |
| ------ | ----------------------------------------------- | ---------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| [ ]    | Deadline enforcement and retry policy           | Vardz - Tech Lead / `feature/infra-core`                   | Integration paths from Day 2 | Hard timeout controls and bounded retry rules                            |
| [ ]    | Anti-bot failure handling and fallback capture  | Kurt - Scraping Specialist / `feature/brightdata-pipeline` | Browser capture flow         | Clean failure states for blocked or partially rendered targets           |
| [ ]    | Cease-and-desist report generator               | Zie - AI Engineer / `feature/claude-orchestration`         | Validated threat records     | Structured legal draft with evidence citations and abuse contact hints   |
| [ ]    | Evidence viewer and report action panel         | Charles - Frontend UI/UX / `feature/dashboard-ui`          | Threat and report fixtures   | UI for screenshot review, report preview, and manual approval            |
| [ ]    | Validation suite expansion and release criteria | Pol - QA & Strategy / `feature/qa-validation`              | End-to-end flows from Day 2  | Regression tests covering timeout, evidence integrity, and report gating |

#### Task: Deadline enforcement and retry policy

- Assigned: Vardz (Tech Lead) — `feature/infra-core`
- Strict instructions (junior-level):
  1.  Add a global scan deadline using `SCAN_DEADLINE_MS` and store `deadlineAt` on every scan job.
  2.  Short-circuit any downstream network or browser call when less than 15 seconds remain.
  3.  Allow only one retry for transient fetch failures and disable retries when the remaining budget is low.
  4.  Add unit tests that prove the deadline stops work and the retry guard prevents extra attempts.

AI Prompt (copy/paste):

```
You are a reliability engineer helping a junior developer harden the scan pipeline.
Step-by-step: implement `SCAN_DEADLINE_MS`, attach `deadlineAt` to every job, pass a cancellable signal into HTTP and browser operations, and enforce the rule that no retry happens when less than 15 seconds remain. Add clear unit test examples for deadline expiry and low-budget cancellation. Keep the solution simple and production-safe.
```

#### Task: Anti-bot failure handling and fallback capture

- Assigned: Kurt (Scraping Specialist) — `feature/brightdata-pipeline`
- Strict instructions (junior-level):
  1.  Classify capture failures into `fetch_failed`, `render_failed`, `blocked_by_target`, and `incomplete_evidence`.
  2.  When a target blocks the scrape, capture headers, status code, and a short console log snippet, then persist the record with `analysisState='needs_review'`.
  3.  Retry with Web Unlocker only once, then stop and store the fallback result.
  4.  Add tests that simulate each failure category and prove the stored evidence is still usable.

AI Prompt (copy/paste):

```
You are an anti-bot handling assistant helping a junior scraper engineer.
Step-by-step: define the failure categories `fetch_failed`, `render_failed`, `blocked_by_target`, and `incomplete_evidence`; capture useful headers/status/console snippets when blocked; retry with Web Unlocker only one time; and persist a minimal evidence record even when the page cannot be fully captured. Include test cases for each failure category so the team can verify the behavior.
```

#### Task: Cease-and-desist report generator

- Assigned: Zie (AI Engineer) — `feature/claude-orchestration`
- Strict instructions (junior-level):
  1.  Build a `legalReport` JSON generator that accepts a validated `threatId` and uses only trusted evidence references.
  2.  Include the report summary, evidence citations, registrar hints, and abuse contact hints in a schema-valid JSON response.
  3.  If validation fails, return `reportStatus: review_required` and keep the raw model output for debugging.
  4.  Add a preview route so the team can review the JSON before anything is shown in the UI.

AI Prompt (copy/paste):

```
You are an AI engineer helping a junior developer generate a takedown summary report.
Step-by-step: accept a validated `threatId`, fetch only verified evidence and metadata from the database, call Claude with a tight prompt that returns JSON only, validate the response against the report schema, and store the `legalReport` record. If validation fails, mark the result as `review_required` and keep the raw output. Also provide a preview endpoint that returns the generated JSON for manual review.
```

#### Task: Evidence viewer and report action panel

- Assigned: Charles (UI/UX Frontend) — `feature/dashboard-ui`
- Strict instructions (junior-level):
  1.  Show the summary report on `/dashboard/threats` first as readable template content, while keeping the JSON available for raw review.
  2.  Add an evidence viewer that safely previews the screenshot and a sandboxed HTML snapshot.
  3.  Add a report action panel with `Preview Report`, `Approve Report`, and `Request Changes` actions.
  4.  Keep the UI easy to understand for technical and non-technical users, with optimistic updates and error fallback.

AI Prompt (copy/paste):

```
You are a frontend assistant helping a junior developer design the report review experience.
Step-by-step: create a readable summary-report template on `/dashboard/threats` that renders the JSON in a human-friendly way, while also preserving the raw JSON for technical review; build an evidence viewer that safely displays a screenshot and sandboxed HTML snapshot; and add a report action panel with `Preview Report`, `Approve Report`, and `Request Changes` actions. Make the UI clear for both technical and non-technical users and include optimistic updates with rollback on API failure.
```

#### Task: Validation suite expansion and release criteria

- Assigned: Pol (QA and Strategy) — `feature/qa-validation`
- Strict instructions (junior-level):
  1.  Expand the smoke suite to cover deadline abort, anti-bot failures, schema validation failures, and report gating.
  2.  Add regression tests for tenant isolation and evidence integrity.
  3.  Define Day 3 pass criteria: core pipeline works end-to-end in test mode and report JSON validates.
  4.  Write a short runbook for reproducing any failure locally.

AI Prompt (copy/paste):

```
You are a QA strategist helping a junior developer expand the validation suite.
Step-by-step: add tests for deadline cancellation, anti-bot failure handling, Claude schema validation errors, tenant isolation, and report gating. Include a clear Day 3 pass/fail checklist and a short runbook for reproducing failures locally. Keep the tests simple, deterministic, and focused on the MVP flow.
```

---

## Day 4 - Final MVP Assembly and Launch Readiness

Goal: Deliver the complete GhostNet AI MVP. By the end of Day 4, a user should enter a name on `/dashboard`, trigger scraping, be redirected to `/dashboard/threats`, view the summary report in a readable template, inspect the raw JSON if needed, and download the summary report as a PDF.

| Status | Task Name                                     | Assigned Member & Branch                                   | Dependencies                     | Target Deliverable                                                  |
| ------ | --------------------------------------------- | ---------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| [ ]    | Final integration polish and release gate     | Vardz - Tech Lead / `feature/infra-core`                   | All feature branches merged      | Release candidate with clean build and deploy sequence              |
| [ ]    | Search coverage tuning and edge-case sampling | Kurt - Scraping Specialist / `feature/brightdata-pipeline` | Production-like fixtures         | Finalized discovery patterns with safe limits and tuned filters     |
| [ ]    | Prompt optimization and JSON validation sweep | Zie - AI Engineer / `feature/claude-orchestration`         | Realistic evidence samples       | Lower-failure-rate analysis prompt and validation guardrail set     |
| [ ]    | UI responsiveness and presentation polish     | Charles - Frontend UI/UX / `feature/dashboard-ui`          | Stable live feed and report flow | Demo-ready dashboard with mobile-safe layout and clear states       |
| [ ]    | Final QA, launch checklist, and handoff notes | Pol - QA & Strategy / `feature/qa-validation`              | Full integrated build            | Sign-off document, known risks log, and demo verification checklist |

#### Task: Final integration polish and release gate

- Assigned: Vardz (Tech Lead) — `feature/infra-core`
- Strict instructions (junior-level):
  1.  Merge the remaining feature work into the shared release branch and verify the full end-to-end flow from dashboard input to report output.
  2.  Make sure the scan job, persistence, and report generation steps are stable enough for the MVP demo.
  3.  Create the final release candidate checklist and confirm required environment variables and secrets are present.
  4.  Coordinate the final sign-off with QA after the integrated flow passes.

AI Prompt (copy/paste):

```
You are a release engineer helping a junior developer finish the GhostNet AI MVP.
Step-by-step: verify the end-to-end path from `/dashboard` input, to scraping, to redirecting the user to `/dashboard/threats`, to showing the summary report; confirm the report generator and persistence are stable; and create the release candidate checklist with all required env var checks. Keep the instructions clear enough for the team to execute without confusion.
```

#### Task: Search coverage tuning and edge-case sampling

- Assigned: Kurt (Scraping Specialist) — `feature/brightdata-pipeline`
- Strict instructions (junior-level):
  1.  Tune the discovery patterns so the scan results are cleaner and the summary report is more reliable.
  2.  Sample edge cases that might break the scrape and make sure the fallback evidence still supports the report.
  3.  Reduce false positives and cap the candidate set so the demo stays fast.
  4.  Share a final filtered sample set with QA and the AI engineer.

AI Prompt (copy/paste):

```
You are a data tuning assistant helping a junior scraping engineer finish the MVP.
Step-by-step: run the discovery prototype against a curated set of edge-case brand variants, identify false positives, tune the query filters, and produce a final filtered sample set that is safe for the demo. Keep the output compact and useful for QA and the report generator.
```

#### Task: Prompt optimization and JSON validation sweep

- Assigned: Zie (AI Engineer) — `feature/claude-orchestration`
- Strict instructions (junior-level):
  1.  Re-run the Claude prompt against the final evidence samples and make sure the JSON is stable.
  2.  Tighten the report prompt so it always returns the report schema needed for the readable template and PDF export.
  3.  Add a short mapping document of common failure modes and the prompt fix for each one.
  4.  Commit the final prompt version and keep the preview route aligned with it.

AI Prompt (copy/paste):

```
You are an LLM prompt optimization assistant helping a junior developer make the final report prompt stable.
Step-by-step: re-run the takedown report prompt against realistic evidence samples, tune it so the model returns only valid JSON with the correct report schema, document the most common failure modes and how the prompt fixes them, and keep the preview route in sync with the final prompt version. The goal is a reliable summary report that can be displayed and exported.
```

#### Task: UI responsiveness and presentation polish

- Assigned: Charles (UI/UX Frontend) — `feature/dashboard-ui`
- Strict instructions (junior-level):
  1.  Finish the `/dashboard` form so the user can enter the target name and start the scan without confusion.
  2.  Make `/dashboard/threats` show the summary report in a readable template format with a switch to inspect the raw JSON.
  3.  Add the PDF download action for the summary report and keep the evidence viewer mobile-safe and accessible.
  4.  Add clear loading, success, and error states so technical and non-technical users understand what is happening.

AI Prompt (copy/paste):

```
You are a frontend QA and UX assistant helping a junior developer finalize the GhostNet AI dashboard.
Step-by-step: finish the `/dashboard` input form, redirect the user to `/dashboard/threats` after scraping, render the summary report in a readable template format, preserve the raw JSON for technical review, and add a PDF download button for the report. Make the experience clear, responsive, and easy for both technical and non-technical users.
```

#### Task: Final QA, launch checklist, and handoff notes

- Assigned: Pol (QA and Strategy) — `feature/qa-validation`
- Strict instructions (junior-level):
  1.  Run the final smoke tests against the complete MVP path from `/dashboard` to `/dashboard/threats`.
  2.  Verify the readable summary template, the raw JSON view, and the PDF download all work as expected.
  3.  Produce the launch checklist with known risks, reproduction steps, and demo verification steps.
  4.  Confirm the product is ready for handoff only after the complete user flow passes.

AI Prompt (copy/paste):

```
You are a QA release assistant helping a junior team complete the GhostNet AI MVP.
Step-by-step: run the final smoke and regression checks for the full user flow, confirm the user can input a name on `/dashboard`, get redirected to `/dashboard/threats`, view the summary report in a readable template, inspect the JSON, and download the PDF. Then prepare the launch checklist, known risks, and handoff notes so the team can finish confidently.
```

---

Notes and Prioritization Guidance

- Day 3 should make the pipeline trustworthy: deadlines, retries, fallback evidence, and JSON report generation.
- Day 4 should make the product usable: redirect to `/dashboard/threats`, readable summary template, and PDF download.
- Every member should contribute on both days so no one is blocked waiting on a single owner.

---

## Operating Rules for the Whole Sprint (Clear and Strict)

- Always open a PR early with a working stub; do not wait to finish a feature before creating a PR.
- Each handoff must include: a sample artifact (JSON), a short usage note (one paragraph), and the branch/PR link.
- Keep PRs small (under 300 lines where possible) and label by owner and day (e.g., `Member2-Day2`).
- Use the provided AI prompts for routine tasks; always review and human-approve generated code before merging.
- Daily standup: each member posts a short status update in Slack with `branch`, `blocking_issues`, and `handoff_urls`.

---

End of updated sprint plan. Follow the prompts and strict instructions for predictable, parallel progress.
