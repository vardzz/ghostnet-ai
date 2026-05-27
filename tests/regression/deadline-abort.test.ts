/**
 * @file tests/regression/deadline-abort.test.ts
 * @description Day 3 — Regression Suite: Deadline Enforcement
 *
 * Covers:
 *  DA-01  Scan start response includes deadlineAt timestamp
 *  DA-02  Deadline status endpoint signals shouldAbort when < 15s remain
 *  DA-03  Deadline status signals safe when > 15s remain
 *  DA-04  Abort endpoint accepts scanId and returns confirmation
 *  DA-05  Abort endpoint rejects missing scanId with 400
 *  DA-06  Low-budget scenario (< 15s) always sets shouldAbort = true
 */

import request from "supertest";
import { createExtendedMockServer } from "../helpers/mockServer.extended";

const { app } = createExtendedMockServer();

describe("Deadline Enforcement — DA suite (6 tests)", () => {
  // ── DA-01 ───────────────────────────────────────────────────────────────────
  it("DA-01: scan start response contains deadlineAt timestamp", async () => {
    const res = await request(app).post("/api/brands/monitor").send({
      brandName: "GhostNet AI",
      officialDomain: "ghostnet.ai",
    });

    expect(res.status).toBe(200);
    expect(res.body.scan.deadlineAt).toBeDefined();
    // deadlineAt must be a valid ISO 8601 timestamp
    expect(new Date(res.body.scan.deadlineAt).getTime()).toBeGreaterThan(Date.now());
  });

  // ── DA-02 ───────────────────────────────────────────────────────────────────
  it("DA-02: deadline status signals shouldAbort=true when < 15s remain", async () => {
    const res = await request(app)
      .get("/api/scan/scan_A/deadline")
      .query({ remainingMs: 5000 }); // 5s < 15s threshold

    expect(res.status).toBe(200);
    expect(res.body.shouldAbort).toBe(true);
    expect(res.body.remainingMs).toBeLessThan(15_000);
  });

  // ── DA-03 ───────────────────────────────────────────────────────────────────
  it("DA-03: deadline status signals shouldAbort=false when > 15s remain", async () => {
    const res = await request(app)
      .get("/api/scan/scan_A/deadline")
      .query({ remainingMs: 60_000 }); // 60s — safe

    expect(res.status).toBe(200);
    expect(res.body.shouldAbort).toBe(false);
    expect(res.body.remainingMs).toBeGreaterThanOrEqual(15_000);
  });

  // ── DA-04 ───────────────────────────────────────────────────────────────────
  it("DA-04: abort endpoint accepts scanId and returns confirmation", async () => {
    const res = await request(app)
      .post("/api/scan/abort")
      .send({ scanId: "scan_A", reason: "deadline_exceeded" });

    expect(res.status).toBe(200);
    expect(res.body.aborted).toBe(true);
    expect(res.body.scanId).toBe("scan_A");
    expect(res.body.reason).toBe("deadline_exceeded");
    expect(res.body.abortedAt).toBeDefined();
  });

  // ── DA-05 ───────────────────────────────────────────────────────────────────
  it("DA-05: abort endpoint rejects request with missing scanId (400)", async () => {
    const res = await request(app).post("/api/scan/abort").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // ── DA-06 ───────────────────────────────────────────────────────────────────
  it("DA-06: any remaining budget < 15 000ms always triggers shouldAbort", async () => {
    const budgets = [0, 1000, 5000, 14999];

    for (const ms of budgets) {
      const res = await request(app)
        .get("/api/scan/scan_A/deadline")
        .query({ remainingMs: ms });

      expect(res.body.shouldAbort).toBe(true);
    }
  });
});
