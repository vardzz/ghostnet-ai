import express from "express";

const signedUrl = (path: string) =>
  `https://project.supabase.co/storage/v1/object/sign/${path}?token=SIGNED_TOKEN`;

export const createMockServer = () => {
  const app = express();
  app.use(express.json());

  const tenantId = "tenant_demo";
  const brandId = "brand_demo";

  app.post("/api/brands/monitor", (_req, res) => {
    res.json({
      brand: {
        id: brandId,
        brandName: "GhostNet AI",
        officialDomain: "ghostnet.ai",
        primarySocialHandles: [],
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      scan: {
        id: "scan_demo",
        status: "running",
        queuedAt: new Date().toISOString(),
        deadlineAt: new Date(Date.now() + 110000).toISOString(),
        candidateLimit: 8,
      },
      dashboard: {
        liveThreatsUrl: `/dashboard/threats?brand=${brandId}`,
        brandDetailUrl: `/dashboard/brands/${brandId}`,
      },
    });
  });

  app.get("/api/threats/live", (req, res) => {
    const requestTenant = req.header("x-tenant-id");
    if (!requestTenant || requestTenant !== tenantId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const requestedBrandId = String(req.query.brandId || "");
    if (requestedBrandId && requestedBrandId !== brandId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    return res.json({
      brandId,
      generatedAt: new Date().toISOString(),
      activeCount: 1,
      threats: [
        {
          id: "threat_demo",
          brandId,
          scanId: "scan_demo",
          threatType: "typosquat",
          targetUrl: "https://ghostnct.ai/login",
          observedDomain: "ghostnct.ai",
          rawTitle: "GhostNet AI Secure Login",
          threatScore: 92,
          confidenceScore: 0.96,
          urgencyLevel: "high",
          threatState: "captured",
          analysisState: "needs_review",
          reportStatus: "review_required",
          screenshotUrl: signedUrl("evidence/screenshots/threat_demo.png"),
          htmlSnapshotUrl: signedUrl("evidence/html/threat_demo.html"),
          firstSeenAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  });

  app.post("/api/takedown/generate", (req, res) => {
    const { reviewerName, invalidModelOutput } = req.body || {};
    if (invalidModelOutput) {
      return res.status(422).json({ error: "schema_validation_failed" });
    }

    res.json({
      reportId: "report_demo",
      threatId: "threat_demo",
      brandId,
      jurisdiction: "US",
      abuseEmail: null,
      reportStatus: reviewerName ? "approved" : "review_required",
      generatedAt: new Date().toISOString(),
      evidence: {
        screenshotUrl: signedUrl("evidence/screenshots/threat_demo.png"),
        htmlSnapshotUrl: signedUrl("evidence/html/threat_demo.html"),
        sourceUrl: "https://ghostnct.ai/login",
        capturedAt: new Date().toISOString(),
      },
      legalReport: {
        title: "Cease and Desist Review Packet - GhostNet AI",
        executiveSummary: "Review required before external submission.",
        registrarFindings: [],
        hostFindings: [],
        ceaseAndDesistNotice: "",
        nextSteps: ["Human review"],
      },
    });
  });

  return { app, tenantId, brandId };
};
