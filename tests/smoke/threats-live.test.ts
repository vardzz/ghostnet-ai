import request from "supertest";
import { createMockServer } from "./mockServer";

describe("GET /api/threats/live", () => {
  it("rejects requests without the tenant header", async () => {
    const { app } = createMockServer();
    const response = await request(app).get("/api/threats/live");

    expect(response.status).toBe(401);
  });

  it("rejects cross-tenant brand access", async () => {
    const { app } = createMockServer();
    const response = await request(app)
      .get("/api/threats/live?brandId=brand_other")
      .set("x-tenant-id", "tenant_demo");

    expect(response.status).toBe(401);
  });

  it("returns signed evidence URLs and needs_review state for blocked capture", async () => {
    const { app, brandId, tenantId } = createMockServer();
    const response = await request(app)
      .get(`/api/threats/live?brandId=${brandId}`)
      .set("x-tenant-id", tenantId);

    expect(response.status).toBe(200);
    const threat = response.body.threats[0];
    expect(threat.analysisState).toBe("needs_review");
    expect(threat.threatState).toBe("captured");
    expect(threat.screenshotUrl).toContain("/storage/v1/object/sign/");
    expect(threat.htmlSnapshotUrl).toContain("/storage/v1/object/sign/");
  });
});
