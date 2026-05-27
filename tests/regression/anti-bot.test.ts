/**
 * @file tests/regression/anti-bot.test.ts
 * @description Day 3 — Regression Suite: Anti-Bot Failure Handling
 *
 * Covers all 4 canonical failure categories:
 *  AB-01  fetch_failed       — connection refused / DNS failure
 *  AB-02  render_failed      — page loaded but JS rendering timed out
 *  AB-03  blocked_by_target  — 403/CAPTCHA from anti-bot protection
 *  AB-04  incomplete_evidence — partial capture (e.g. no HTML snapshot)
 *  AB-05  All failure modes  → analysisState = "needs_review"
 *  AB-06  All failure modes  → headers/consoleLog captured in response
 *  AB-07  Happy path capture → success with signed URLs
 */

import request from "supertest";
import { createExtendedMockServer } from "../helpers/mockServer.extended";

const { app } = createExtendedMockServer();

const FAILURE_MODES = [
  "fetch_failed",
  "render_failed",
  "blocked_by_target",
  "incomplete_evidence",
] as const;

describe("Anti-Bot Failure Handling — AB suite (7 tests)", () => {
  // ── AB-01 ───────────────────────────────────────────────────────────────────
  it("AB-01: fetch_failed returns 422 with failureCategory=fetch_failed", async () => {
    const res = await request(app)
      .post("/api/capture")
      .send({ failureMode: "fetch_failed" });

    expect(res.status).toBe(422);
    expect(res.body.failureCategory).toBe("fetch_failed");
    expect(res.body.success).toBe(false);
  });

  // ── AB-02 ───────────────────────────────────────────────────────────────────
  it("AB-02: render_failed returns 422 with failureCategory=render_failed", async () => {
    const res = await request(app)
      .post("/api/capture")
      .send({ failureMode: "render_failed" });

    expect(res.status).toBe(422);
    expect(res.body.failureCategory).toBe("render_failed");
    expect(res.body.success).toBe(false);
  });

  // ── AB-03 ───────────────────────────────────────────────────────────────────
  it("AB-03: blocked_by_target returns 422 with statusCode=403 and headers", async () => {
    const res = await request(app)
      .post("/api/capture")
      .send({ failureMode: "blocked_by_target" });

    expect(res.status).toBe(422);
    expect(res.body.failureCategory).toBe("blocked_by_target");
    expect(res.body.statusCode).toBe(403);
    expect(res.body.headers).toBeDefined();
  });

  // ── AB-04 ───────────────────────────────────────────────────────────────────
  it("AB-04: incomplete_evidence returns 422 with failureCategory=incomplete_evidence", async () => {
    const res = await request(app)
      .post("/api/capture")
      .send({ failureMode: "incomplete_evidence" });

    expect(res.status).toBe(422);
    expect(res.body.failureCategory).toBe("incomplete_evidence");
    expect(res.body.success).toBe(false);
  });

  // ── AB-05 ───────────────────────────────────────────────────────────────────
  it("AB-05: ALL failure modes set analysisState=needs_review", async () => {
    for (const mode of FAILURE_MODES) {
      const res = await request(app)
        .post("/api/capture")
        .send({ failureMode: mode });

      expect(res.body.analysisState).toBe("needs_review");
    }
  });

  // ── AB-06 ───────────────────────────────────────────────────────────────────
  it("AB-06: ALL failure modes include headers and consoleLog in response", async () => {
    for (const mode of FAILURE_MODES) {
      const res = await request(app)
        .post("/api/capture")
        .send({ failureMode: mode });

      expect(res.body.headers).toBeDefined();
      expect(typeof res.body.consoleLog).toBe("string");
      expect(res.body.consoleLog.length).toBeGreaterThan(0);
    }
  });

  // ── AB-07 ───────────────────────────────────────────────────────────────────
  it("AB-07: happy path capture returns success with signed screenshot and HTML URLs", async () => {
    const res = await request(app).post("/api/capture").send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.screenshotUrl).toContain("token=SIGNED_TOKEN");
    expect(res.body.htmlSnapshotUrl).toContain("token=SIGNED_TOKEN");
  });
});
