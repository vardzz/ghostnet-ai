# QA Acceptance Checklist (Hackathon Sprint)

This checklist aligns with the Security and Compliance track scope and the GhostNet AI API contracts.

## Required Acceptance Criteria

1. Happy-path scan
   - Brand registration returns a scan payload and dashboard links.
   - Live threats endpoint returns at least one threat with scoring fields.

2. Blocked-fetch handling
   - Blocked or partial evidence results are persisted with `analysisState = needs_review`.
   - Threats remain visible in the live feed with evidence placeholders.

3. Schema validation failures
   - Invalid model output returns a 422-style error and does not mark threats as validated.
   - The raw output is captured for review (log or storage) in test fixtures.

4. Report gating
   - Reports default to `review_required` unless a reviewer explicitly approves.
   - No automated external notice is triggered without review.

5. Tenant isolation
   - Cross-tenant access to threat feeds or evidence is denied (401/403).
   - Evidence URLs remain scoped to the requesting tenant.

6. Evidence integrity
   - Evidence URLs are signed (or explicitly flagged as demo-public).
   - Threat records include source URL and capture timestamp.

## Smoke Tests

Smoke tests live under `tests/smoke/`:

- `brand-monitor.test.ts`
- `threats-live.test.ts`
- `takedown-generate.test.ts`

## Run Instructions

```bash
npm install
npm test
```
