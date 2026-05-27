/**
 * @file tests/regression/rls-tenant-isolation.test.ts
 * @description Day 3 — Regression Suite: RLS Cross-Tenant Isolation
 *
 * Uses two separate tenant fixtures (Tenant A, Tenant B) to verify:
 *  - Access without a tenant header → explicit 403 (not silent 200)
 *  - Tenant A cannot read Tenant B's threats (and vice versa)
 *  - Evidence URLs never cross tenants
 *  - Threat IDs never overlap between tenants
 *  - Each tenant can still read their own data normally
 *
 *  RLS-01  No auth header → 403 with RLS_VIOLATION code
 *  RLS-02  Wrong tenant header → 403 with RLS_VIOLATION code
 *  RLS-03  Tenant A cannot access Tenant B's brandId threats
 *  RLS-04  Tenant B cannot access Tenant A's brandId threats
 *  RLS-05  Tenant A cannot read Tenant B's threat by ID
 *  RLS-06  Tenant B cannot read Tenant A's threat by ID
 *  RLS-07  403 response is explicit — not a silent empty 200
 *  RLS-08  Evidence screenshot URLs are scoped to the correct tenant
 *  RLS-09  Threat IDs never overlap between tenants
 *  RLS-10  Both tenants can access their own data independently
 */

import request from "supertest";
import { createExtendedMockServer, TENANT_A, TENANT_B } from "../helpers/mockServer.extended";

const { app } = createExtendedMockServer();

describe("RLS Tenant Isolation — RLS suite (10 tests)", () => {
  // ── RLS-01 ──────────────────────────────────────────────────────────────────
  it("RLS-01: request with no x-tenant-id header → 403 with RLS_VIOLATION", async () => {
    const res = await request(app).get("/api/threats/live");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("RLS_VIOLATION");
    expect(res.body.error).toBeDefined();
  });

  // ── RLS-02 ──────────────────────────────────────────────────────────────────
  it("RLS-02: request with unknown tenant header → 403 with RLS_VIOLATION", async () => {
    const res = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", "tenant_unknown");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("RLS_VIOLATION");
  });

  // ── RLS-03 ──────────────────────────────────────────────────────────────────
  it("RLS-03: Tenant A cannot access Tenant B's brandId threats → 403", async () => {
    const res = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_A.tenantId)
      .query({ brandId: TENANT_B.brandId }); // Trying to access Tenant B's brand

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("RLS_CROSS_TENANT");
  });

  // ── RLS-04 ──────────────────────────────────────────────────────────────────
  it("RLS-04: Tenant B cannot access Tenant A's brandId threats → 403", async () => {
    const res = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_B.tenantId)
      .query({ brandId: TENANT_A.brandId }); // Trying to access Tenant A's brand

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("RLS_CROSS_TENANT");
  });

  // ── RLS-05 ──────────────────────────────────────────────────────────────────
  it("RLS-05: Tenant A cannot read Tenant B's threat by ID → 403", async () => {
    const res = await request(app)
      .get(`/api/threats/${TENANT_B.threatId}`)
      .set("x-tenant-id", TENANT_A.tenantId);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("RLS_CROSS_TENANT");
  });

  // ── RLS-06 ──────────────────────────────────────────────────────────────────
  it("RLS-06: Tenant B cannot read Tenant A's threat by ID → 403", async () => {
    const res = await request(app)
      .get(`/api/threats/${TENANT_A.threatId}`)
      .set("x-tenant-id", TENANT_B.tenantId);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("RLS_CROSS_TENANT");
  });

  // ── RLS-07 ──────────────────────────────────────────────────────────────────
  it("RLS-07: 403 response is explicit — not a silent empty 200", async () => {
    const res = await request(app)
      .get(`/api/threats/${TENANT_B.threatId}`)
      .set("x-tenant-id", TENANT_A.tenantId);

    // Must NOT be 200 (silent empty response is a security bug)
    expect(res.status).not.toBe(200);
    expect(res.status).toBe(403);
    // Body must explain the denial
    expect(res.body.error).toBeDefined();
    expect(res.body.code).toBeDefined();
  });

  // ── RLS-08 ──────────────────────────────────────────────────────────────────
  it("RLS-08: evidence screenshot URLs are scoped to the correct tenant", async () => {
    const resA = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_A.tenantId);

    const resB = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_B.tenantId);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const urlA = resA.body.threats[0].screenshotUrl as string;
    const urlB = resB.body.threats[0].screenshotUrl as string;

    // URLs must reference different paths
    expect(urlA).not.toBe(urlB);
    // Each URL should contain the threat ID for that tenant
    expect(urlA).toContain(TENANT_A.threatId);
    expect(urlB).toContain(TENANT_B.threatId);
  });

  // ── RLS-09 ──────────────────────────────────────────────────────────────────
  it("RLS-09: threat IDs never overlap between tenants", async () => {
    const resA = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_A.tenantId);

    const resB = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_B.tenantId);

    const idsA = resA.body.threats.map((t: { id: string }) => t.id);
    const idsB = resB.body.threats.map((t: { id: string }) => t.id);

    // No threat ID should appear in both tenants
    const overlap = idsA.filter((id: string) => idsB.includes(id));
    expect(overlap).toHaveLength(0);
  });

  // ── RLS-10 ──────────────────────────────────────────────────────────────────
  it("RLS-10: both tenants can access their own data independently", async () => {
    const resA = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_A.tenantId);

    const resB = await request(app)
      .get("/api/threats/live")
      .set("x-tenant-id", TENANT_B.tenantId);

    // Tenant A gets its own data
    expect(resA.status).toBe(200);
    expect(resA.body.brandId).toBe(TENANT_A.brandId);
    expect(resA.body.threats.length).toBeGreaterThan(0);

    // Tenant B gets its own data
    expect(resB.status).toBe(200);
    expect(resB.body.brandId).toBe(TENANT_B.brandId);
    expect(resB.body.threats.length).toBeGreaterThan(0);
  });
});
