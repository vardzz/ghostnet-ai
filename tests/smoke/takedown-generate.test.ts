import request from "supertest";
import { createMockServer } from "./mockServer";

describe("POST /api/takedown/generate", () => {
  it("returns 422 when model output is invalid", async () => {
    const { app } = createMockServer();
    const response = await request(app)
      .post("/api/takedown/generate")
      .send({ invalidModelOutput: true });

    expect(response.status).toBe(422);
  });

  it("keeps report gated without reviewer approval", async () => {
    const { app } = createMockServer();
    const response = await request(app)
      .post("/api/takedown/generate")
      .send({ reviewerName: "" });

    expect(response.status).toBe(200);
    expect(response.body.reportStatus).toBe("review_required");
  });

  it("approves report when reviewer is provided", async () => {
    const { app } = createMockServer();
    const response = await request(app)
      .post("/api/takedown/generate")
      .send({ reviewerName: "Zie" });

    expect(response.status).toBe(200);
    expect(response.body.reportStatus).toBe("approved");
  });
});
