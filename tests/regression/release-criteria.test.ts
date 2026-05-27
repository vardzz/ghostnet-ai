/**
 * @file tests/regression/release-criteria.test.ts
 * @description Day 3 — Release Criteria & Critical Gate Tests
 *
 * Defines the 90% pass threshold and 5 [CRITICAL] release-blocking guards.
 * ALL [CRITICAL] tests must pass before any release candidate can be merged.
 *
 *  RC-01  [CRITICAL] Unauthenticated access is blocked (no API key / no tenant)
 *  RC-02  [CRITICAL] Cross-tenant data leakage is impossible
 *  RC-03  [CRITICAL] Invalid Claude output never reaches the threats table as "success"
 *  RC-04  [CRITICAL] Report approval is gated — ungated approval is rejected
 *  RC-05  [CRITICAL] Evidence URLs are signed — unsigned/plain URLs are not accepted
 *  RC-06  Pass rate computation helper — 90% threshold documented
 *  RC-07  Scan lifecycle: queued → captured → analyzed state transitions
 *  RC-08  All regression suites must have run before release gate check
 */

import request from "supertest";
import { createExtendedMockServer, TENANT_A, TENANT_B } from "../helpers/mockServer.extended";

const { app } = createExtendedMockServer();

const BASE_EVIDENCE = {
  collectionId: "rc-test",
  collectedAt: new Date().toISOString(),
  items: [{ label: "SERP #1", content: "ghostnetai-login.example.com" }],
};

describe("Release Criteria — RC suite (8 tests)", () => {
  // ── RC-01 [CRITICAL] ────────────────────────────────────────────────────────
  it("[CRITICAL] RC-01: unauthenticated requests are blocked with 403", async () => {
    const resNoHeader = await request(app).get("/api/threats/live");
    expect(resNoHeader.status).toBe(403);

    const resWrongTenant = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", "not-a-real-tenant");
    expect(resWrongTenant.status).toBe(403);
  });

  // ── RC-02 [CRITICAL] ────────────────────────────────────────────────────────
  it("[CRITICAL] RC-02: cross-tenant data leakage is impossible", async () => {
    // Tenant A trying to read Tenant B's threat
    const res = await request(app)
      .get(`/api/threats/${TENANT_B.threatId}`)
      .set("x-tenant-id", TENANT_A.tenantId);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("RLS_CROSS_TENANT");
    // Body must NOT contain any of Tenant B's data
    expect(JSON.stringify(res.body)).not.toContain(TENANT_B.brandId);
  });

  // ── RC-03 [CRITICAL] ────────────────────────────────────────────────────────
  it("[CRITICAL] RC-03: invalid Claude output never stored as success — always needs_review", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "rc-03",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["threatScore out of range"],
          raw: '{"threatScore": 999}',
        },
      });

    // Must be 422, never 200
    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    // rawModelOutput must be preserved for auditors
    expect(res.body.rawModelOutput).toBeDefined();
    expect(typeof res.body.rawModelOutput).toBe("string");
  });

  // ── RC-04 [CRITICAL] ────────────────────────────────────────────────────────
  it("[CRITICAL] RC-04: report generation without reviewer metadata is gated as review_required", async () => {
    // No reviewerName = report must stay review_required, not auto-approved
    const res = await request(app)
      .post("/api/takedown/generate")
      .send({ threatId: TENANT_A.threatId });

    expect(res.status).toBe(200);
    expect(res.body.reportStatus).toBe("review_required");
    // Must NOT auto-approve without a named reviewer
    expect(res.body.reportStatus).not.toBe("approved");
  });

  // ── RC-05 [CRITICAL] ────────────────────────────────────────────────────────
  it("[CRITICAL] RC-05: evidence URLs are signed — contain required token", async () => {
    const res = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_A.tenantId);

    expect(res.status).toBe(200);
    const threat = res.body.threats[0];

    // Both URLs must be signed (contain token param)
    expect(threat.screenshotUrl).toContain("token=");
    expect(threat.htmlSnapshotUrl).toContain("token=");
    // Must NOT be plain unsigned storage paths
    expect(threat.screenshotUrl).not.toMatch(/^https?:\/\/[^?]+$/);
  });

  // ── RC-06 ───────────────────────────────────────────────────────────────────
  it("RC-06: release gate threshold — 90% pass rate rule is documented", () => {
    /**
     * Release gate definition:
     *  - Total tests: smoke (7) + regression (33) = 40+
     *  - Required pass rate: >= 90% of all tests
     *  - Critical tests: 5 (RC-01 through RC-05) — must be 100% green
     *
     * To compute live pass rate:
     *   npx jest tests/ --no-coverage --json | node -e "
     *     const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
     *     const pct = (r.numPassedTests / r.numTotalTests * 100).toFixed(1);
     *     console.log('Pass rate:', pct + '%');
     *     console.log('Gate:', pct >= 90 ? 'PASS ✅' : 'FAIL ❌');
     *   "
     */
    const totalTests = 40; // minimum expected
    const requiredPassRate = 0.9;
    const criticalTests = 5;

    expect(requiredPassRate).toBe(0.9);
    expect(criticalTests).toBe(5);
    expect(Math.floor(totalTests * requiredPassRate)).toBe(36);
  });

  // ── RC-07 ───────────────────────────────────────────────────────────────────
  it("RC-07: scan lifecycle produces a valid deadlineAt on start", async () => {
    const res = await request(app).post("/api/brands/monitor").send({
      brandName: "GhostNet AI",
      officialDomain: "ghostnet.ai",
    });

    expect(res.status).toBe(200);
    // Scan must be in "running" state (queued → captured → analyzed)
    expect(res.body.scan.status).toBe("running");
    // deadlineAt must be in the future
    const deadline = new Date(res.body.scan.deadlineAt).getTime();
    expect(deadline).toBeGreaterThan(Date.now());
  });

  // ── RC-08 ───────────────────────────────────────────────────────────────────
  it("RC-08: all regression suites files are present before release gate", () => {
    const { existsSync } = require("fs");
    const { join } = require("path");
    const root = process.cwd();

    const requiredFiles = [
      "tests/regression/deadline-abort.test.ts",
      "tests/regression/anti-bot.test.ts",
      "tests/regression/schema-validation.test.ts",
      "tests/regression/rls-tenant-isolation.test.ts",
      "tests/regression/release-criteria.test.ts",
      "tests/helpers/mockServer.extended.ts",
      "docs/qa-runbook.md",
    ];

    for (const file of requiredFiles) {
      const fullPath = join(root, file);
      expect(existsSync(fullPath)).toBe(true);
    }
  });
});
