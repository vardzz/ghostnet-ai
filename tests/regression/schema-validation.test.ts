/**
 * @file tests/regression/schema-validation.test.ts
 * @description Day 3 — Regression Suite: Claude Schema Validation Failures
 *
 * Validates that every bad Claude output shape is rejected with:
 *  - HTTP 422
 *  - analysisState = "needs_review"
 *  - rawModelOutput attached
 *  - validationErrors array populated
 *
 *  SV-01  threatScore out of range (> 10)
 *  SV-02  confidence out of range (> 1)
 *  SV-03  invalid threatType enum
 *  SV-04  invalid urgencyLevel enum
 *  SV-05  empty evidenceCitations when threatScore > 0
 *  SV-06  reportSummary too short (< 50 chars)
 *  SV-07  reportSummary too long (> 500 chars)
 *  SV-08  missing required field (schemaVersion)
 *  SV-09  non-JSON raw output
 *  SV-10  valid output returns 200 with analysisState=success
 */

import request from "supertest";
import { createExtendedMockServer } from "../helpers/mockServer.extended";

const { app } = createExtendedMockServer();

const BASE_EVIDENCE = {
  collectionId: "test-001",
  collectedAt: new Date().toISOString(),
  items: [{ label: "SERP #1", content: "ghostnetai-login.example.com" }],
};

describe("Claude Schema Validation — SV suite (10 tests)", () => {
  // ── SV-01 ───────────────────────────────────────────────────────────────────
  it("SV-01: threatScore > 10 → 422 with needs_review and rawModelOutput", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-01",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["threatScore must be between 0.00 and 10.00, got 99"],
          raw: '{"threatScore": 99}',
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    expect(res.body.rawModelOutput).toBeDefined();
    expect(Array.isArray(res.body.validationErrors)).toBe(true);
    expect(res.body.validationErrors.length).toBeGreaterThan(0);
  });

  // ── SV-02 ───────────────────────────────────────────────────────────────────
  it("SV-02: confidence > 1 → 422 with needs_review", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-02",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["confidence must be between 0.00 and 1.00, got 1.5"],
          raw: '{"confidence": 1.5}',
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
  });

  // ── SV-03 ───────────────────────────────────────────────────────────────────
  it("SV-03: invalid threatType enum → 422 with needs_review", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-03",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ['threatType must be one of: phishing, malware, ...; got "virus"'],
          raw: '{"threatType": "virus"}',
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    expect(res.body.validationErrors[0]).toContain("threatType");
  });

  // ── SV-04 ───────────────────────────────────────────────────────────────────
  it("SV-04: invalid urgencyLevel enum → 422 with needs_review", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-04",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ['urgencyLevel must be one of: critical, high, medium, low; got "extreme"'],
          raw: '{"urgencyLevel": "extreme"}',
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    expect(res.body.validationErrors[0]).toContain("urgencyLevel");
  });

  // ── SV-05 ───────────────────────────────────────────────────────────────────
  it("SV-05: empty evidenceCitations when threatScore > 0 → 422", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-05",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["evidenceCitations must contain at least one entry when threatScore > 0"],
          raw: '{"evidenceCitations": []}',
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    expect(res.body.validationErrors[0]).toContain("evidenceCitations");
  });

  // ── SV-06 ───────────────────────────────────────────────────────────────────
  it("SV-06: reportSummary < 50 chars → 422 with needs_review", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-06",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["reportSummary must be 50–500 characters, got 10"],
          raw: '{"reportSummary": "Too short"}',
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    expect(res.body.validationErrors[0]).toContain("reportSummary");
  });

  // ── SV-07 ───────────────────────────────────────────────────────────────────
  it("SV-07: reportSummary > 500 chars → 422 with needs_review", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-07",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["reportSummary must be 50–500 characters, got 600"],
          raw: `{"reportSummary": "${"x".repeat(600)}"}`,
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
  });

  // ── SV-08 ───────────────────────────────────────────────────────────────────
  it("SV-08: missing schemaVersion field → 422 with needs_review", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-08",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["schemaVersion must be a string"],
          raw: "{}",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    expect(res.body.validationErrors[0]).toContain("schemaVersion");
  });

  // ── SV-09 ───────────────────────────────────────────────────────────────────
  it("SV-09: non-JSON raw output → 422 with rawModelOutput attached", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({
        threatId: "t-sv-09",
        evidence: BASE_EVIDENCE,
        injectBadOutput: {
          errors: ["Claude response was not valid JSON"],
          raw: "I cannot return JSON for this request.",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.analysisState).toBe("needs_review");
    expect(res.body.rawModelOutput).toBeDefined();
    expect(typeof res.body.rawModelOutput).toBe("string");
  });

  // ── SV-10 ───────────────────────────────────────────────────────────────────
  it("SV-10: valid Claude output → 200 with analysisState=success", async () => {
    const res = await request(app)
      .post("/api/claude/analyze")
      .send({ threatId: "t-sv-10", evidence: BASE_EVIDENCE });

    expect(res.status).toBe(200);
    expect(res.body.analysisState).toBe("success");
    expect(res.body.analysis).toBeDefined();
    expect(res.body.analysis.threatScore).toBeGreaterThanOrEqual(0);
    expect(res.body.analysis.threatScore).toBeLessThanOrEqual(10);
    expect(res.body.validationErrors).toBeNull();
    expect(res.body.rawModelOutput).toBeNull();
  });
});
