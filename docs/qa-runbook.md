# QA Runbook — GhostNet AI Day 3 Regression Suite

**Maintained by:** Zie (QA & Strategy) — `feature/qa-validation`  
**Last updated:** Day 3 Sprint

---

## 1. Environment Setup

### Prerequisites

```bash
# Node.js >= 18
node -v

# Install all dependencies (including supertest, express, jest)
npm install

# Verify Jest is available
npx jest --version
```

### Required environment (create `.env.local` if missing)

```bash
# Not required to run tests — mocks replace all external calls
# Only needed to run the live dev server
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_TIMEOUT_MS=15000
```

---

## 2. Running Tests

### Run ALL tests (smoke + regression)

```bash
npx jest tests/ --no-coverage --verbose
```

### Run only regression tests

```bash
npx jest tests/regression/ --no-coverage --verbose
```

### Run only smoke tests

```bash
npx jest tests/smoke/ --no-coverage --verbose
```

### Run a single suite

```bash
npx jest tests/regression/deadline-abort.test.ts --no-coverage --verbose
npx jest tests/regression/anti-bot.test.ts --no-coverage --verbose
npx jest tests/regression/schema-validation.test.ts --no-coverage --verbose
npx jest tests/regression/rls-tenant-isolation.test.ts --no-coverage --verbose
npx jest tests/regression/release-criteria.test.ts --no-coverage --verbose
```

### Compute live pass rate (release gate check)

```bash
npx jest tests/ --no-coverage --json --outputFile=jest-results.json
node -e "
  const r = require('./jest-results.json');
  const pct = (r.numPassedTests / r.numTotalTests * 100).toFixed(1);
  console.log('Pass rate:', pct + '%');
  console.log('Gate:', parseFloat(pct) >= 90 ? 'PASS ✅' : 'FAIL ❌');
  console.log('Failed tests:', r.numFailedTests);
"
```

---

## 3. Pass / Fail Gate Definition

| Gate | Threshold | Applies To |
|------|-----------|------------|
| **Overall pass rate** | ≥ 90% of all tests | Smoke + Regression combined |
| **[CRITICAL] tests** | 100% must pass | RC-01 through RC-05 |
| **Zero critical defects** | No test marked `[CRITICAL]` may fail | Pre-merge requirement |

**Critical tests (must all be green before any merge to `develop`):**

| ID | Test | What It Protects |
|----|------|-----------------|
| RC-01 | Unauthenticated access blocked | Auth security |
| RC-02 | Cross-tenant leakage impossible | Multi-tenant data isolation |
| RC-03 | Invalid Claude output → needs_review | Data integrity |
| RC-04 | Report approval is gated | Legal workflow integrity |
| RC-05 | Evidence URLs are signed | Storage security |

---

## 4. Test File Map

```
tests/
├── smoke/                            Day 1 — baseline smoke tests
│   ├── mockServer.ts                 Base mock server (single tenant)
│   ├── brand-monitor.test.ts         Brand registration flow
│   ├── threats-live.test.ts          Live threat feed
│   └── takedown-generate.test.ts     Report generation
│
├── helpers/
│   └── mockServer.extended.ts        Day 3 — extended mock (2 tenants, deadline, anti-bot)
│
└── regression/                       Day 3 — regression suites
    ├── deadline-abort.test.ts         DA suite (6 tests)
    ├── anti-bot.test.ts               AB suite (7 tests)
    ├── schema-validation.test.ts      SV suite (10 tests)
    ├── rls-tenant-isolation.test.ts   RLS suite (10 tests)
    └── release-criteria.test.ts       RC suite (8 tests, 5 CRITICAL)
```

---

## 5. Reproducing Failing Scenarios

### DA — Deadline Abort Failures

**Scenario:** `DA-02` fails — `shouldAbort` is `false` when it should be `true`

**Cause:** Deadline threshold logic not using the `< 15 000ms` rule.

**Fix steps:**
1. Open `src/` deadline enforcement code
2. Verify: `if (remainingMs < 15_000) { shouldAbort = true }`
3. Re-run: `npx jest tests/regression/deadline-abort.test.ts --verbose`

**Scenario:** `DA-05` fails — abort endpoint accepts missing scanId

**Cause:** Missing input validation on `/api/scan/abort`

**Fix steps:**
1. Add guard: `if (!body.scanId) return res.status(400).json({ error: "scanId is required" })`
2. Re-run the DA suite

---

### AB — Anti-Bot Failures

**Scenario:** `AB-05` fails — a failure mode does not set `analysisState=needs_review`

**Cause:** One of the 4 failure categories is not setting `analysisState` in the response.

**Fix steps:**
1. Identify which `failureMode` did not return `analysisState: "needs_review"`
2. Check the capture handler in `src/app/api/capture/route.ts`
3. Ensure ALL 4 failure paths (`fetch_failed`, `render_failed`, `blocked_by_target`, `incomplete_evidence`) set `analysisState: "needs_review"`

**Scenario:** `AB-06` fails — `consoleLog` missing from failure response

**Fix steps:**
1. Ensure the capture handler always attaches `consoleLog` to error responses
2. Even if empty, the field must be a non-null string

---

### SV — Schema Validation Failures

**Scenario:** `SV-10` fails — valid output returns non-200

**Cause:** Claude validator is rejecting a valid payload.

**Fix steps:**
1. Run `npx jest tests/regression/schema-validation.test.ts --verbose`
2. Check `src/lib/claude/validator.ts` — confirm the valid payload shape matches `ClaudeAnalysisOutput`
3. Common mistake: `analysedAt` regex is too strict — must accept `2026-05-27T10:00:00.000Z` format

**Scenario:** `SV-09` fails — non-JSON output not caught

**Fix steps:**
1. Check `src/lib/claude/analysis-service.ts` `extractJson()` function
2. Ensure `JSON.parse` is inside a try/catch and sets `analysisState: "needs_review"` on failure

---

### RLS — Tenant Isolation Failures

**Scenario:** `RLS-07` fails — cross-tenant access returns 200 (silent empty) instead of 403

**Cause:** Missing or incorrect RLS policy. Silent `200 { threats: [] }` is a **security bug**.

**Fix steps:**
1. This is a critical defect — escalate to Vardz immediately
2. RLS policy in Supabase must explicitly DENY cross-tenant reads
3. The API layer must return HTTP 403 with a `code: "RLS_CROSS_TENANT"` body — never 200

**Scenario:** `RLS-08` fails — evidence URLs reference wrong tenant paths

**Fix steps:**
1. Check that screenshot/HTML snapshot paths are namespaced by tenant: `evidence/{tenantId}/screenshots/...`
2. Signed URLs must NOT be generated from a shared bucket without tenant-scoping

---

### RC — Release Criteria Failures

**Scenario:** `RC-03` fails — invalid Claude output stored as `success`

**Cause:** Validator is not being called, or its result is being ignored.

**Fix steps:**
1. Open `src/lib/claude/analysis-service.ts`
2. Confirm `validateClaudeOutput(parsed)` is called and `valid === false` triggers `needs_review`
3. Confirm the threats store uses `writeNeedsReview()` on failure, not `writeSuccessfulAnalysis()`

**Scenario:** `RC-04` fails — report auto-approved without reviewer name

**Fix steps:**
1. Check `src/app/api/takedown/generate/route.ts`
2. Ensure `reportStatus` defaults to `"review_required"` when no `reviewerName` is provided
3. `"approved"` must only be set when a non-empty `reviewerName` is present

---

## 6. Common Failures Quick-Fix Table

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| `Cannot find module '../helpers/mockServer.extended'` | File not created | Run `git status` — check if file exists |
| `supertest` import error | Missing dependency | `npm install supertest --save-dev` |
| `express` import error | Missing dependency | `npm install express @types/express --save-dev` |
| RLS test returns 401 instead of 403 | Wrong status code in handler | Change `res.status(401)` to `res.status(403)` |
| `shouldAbort` is always `false` | Threshold wrong | Check `< 15_000` not `<= 15_000` |
| `rawModelOutput` is null on failure | Not attached in error path | Add `rawModelOutput` to all `needs_review` returns |

---

## 7. Pre-Merge Checklist (Zie sign-off)

Before tagging Vardz to merge `feature/qa-validation` into `develop`:

- [ ] `npx jest tests/ --no-coverage` — all tests green
- [ ] Pass rate ≥ 90% (compute with the `--json` command above)
- [ ] All 5 `[CRITICAL]` RC tests are passing
- [ ] No test has been skipped with `.skip` or `xit`
- [ ] `docs/qa-runbook.md` is up to date
- [ ] PR description updated with final test counts

---

*End of QA Runbook — Day 3*
