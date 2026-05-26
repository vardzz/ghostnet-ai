import request from "supertest";
import { createMockServer } from "./mockServer";

describe("POST /api/brands/monitor", () => {
  it("returns a brand and scan payload", async () => {
    const { app } = createMockServer();
    const response = await request(app).post("/api/brands/monitor").send({
      brandName: "GhostNet AI",
      officialDomain: "ghostnet.ai",
      primarySocialHandles: [],
    });

    expect(response.status).toBe(200);
    expect(response.body.brand.id).toBeDefined();
    expect(response.body.scan.status).toBe("running");
    expect(response.body.dashboard.liveThreatsUrl).toContain("/dashboard/threats");
  });
});
