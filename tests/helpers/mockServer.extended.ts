/**
 * @file tests/helpers/mockServer.extended.ts
 * @description Extended mock server for Day 3 regression tests.
 *
 * Adds multi-tenant support (Tenant A + Tenant B), deadline enforcement
 * endpoints, anti-bot capture failure modes, and Claude schema validation
 * error responses on top of the base smoke mock.
 */

import express, { Request, Response } from "express";

// ─── Signed URL Helper ────────────────────────────────────────────────────────

const signedUrl = (path: string) =>
  `https://project.supabase.co/storage/v1/object/sign/${path}?token=SIGNED_TOKEN`;

// ─── Tenant Fixtures ──────────────────────────────────────────────────────────

export const TENANT_A = { tenantId: "tenant_A", brandId: "brand_A", threatId: "threat_A" };
export const TENANT_B = { tenantId: "tenant_B", brandId: "brand_B", threatId: "threat_B" };

// ─── Valid Claude Output ──────────────────────────────────────────────────────

export const VALID_CLAUDE_OUTPUT = {
  schemaVersion: "1.0.0",
  analysedAt: new Date().toISOString(),
  threatScore: 7.43,
  confidence: 0.87,
  threatType: "phishing",
  urgencyLevel: "high",
  evidenceCitations: [
    {
      source: "SERP result #1",
      rationale: "Exact brand name in suspicious domain",
      excerpt: "ghostnetai-login.example.com",
    },
  ],
  reportSummary:
    "A phishing site impersonating GhostNet AI was detected. Immediate takedown is recommended.",
};

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createExtendedMockServer = () => {
  const app = express();
  app.use(express.json());

  // ── Helper: resolve tenant from header ──────────────────────────────────────
  const resolveTenant = (req: Request) => {
    const id = req.header("x-tenant-id");
    if (id === TENANT_A.tenantId) return TENANT_A;
    if (id === TENANT_B.tenantId) return TENANT_B;
    return null;
  };

  // ── GET /api/threats/live — RLS-guarded ─────────────────────────────────────
  app.get("/api/threats/live", (req: Request, res: Response) => {
    const tenant = resolveTenant(req);
    if (!tenant) {
      return res.status(403).json({ error: "forbidden", code: "RLS_VIOLATION" });
    }

    const requestedBrandId = String(req.query.brandId || "");
    if (requestedBrandId && requestedBrandId !== tenant.brandId) {
      return res.status(403).json({ error: "forbidden", code: "RLS_CROSS_TENANT" });
    }

    return res.json({
      brandId: tenant.brandId,
      generatedAt: new Date().toISOString(),
      activeCount: 1,
      threats: [
        {
          id: tenant.threatId,
          brandId: tenant.brandId,
          threatScore: 7.43,
          urgencyLevel: "high",
          analysisState: "success",
          screenshotUrl: signedUrl(`evidence/screenshots/${tenant.threatId}.png`),
          htmlSnapshotUrl: signedUrl(`evidence/html/${tenant.threatId}.html`),
        },
      ],
    });
  });

  // ── GET /api/threats/:id — RLS-guarded ──────────────────────────────────────
  app.get("/api/threats/:id", (req: Request, res: Response) => {
    const tenant = resolveTenant(req);
    if (!tenant) {
      return res.status(403).json({ error: "forbidden", code: "RLS_VIOLATION" });
    }

    const { id } = req.params;
    if (id !== tenant.threatId) {
      return res.status(403).json({ error: "forbidden", code: "RLS_CROSS_TENANT" });
    }

    return res.json({ id: tenant.threatId, brandId: tenant.brandId });
  });

  // ── POST /api/brands/monitor ─────────────────────────────────────────────────
  app.post("/api/brands/monitor", (_req: Request, res: Response) => {
    res.json({
      brand: { id: TENANT_A.brandId, brandName: "GhostNet AI", status: "active" },
      scan: {
        id: "scan_A",
        status: "running",
        deadlineAt: new Date(Date.now() + 110_000).toISOString(),
      },
    });
  });

  // ── POST /api/scan/abort — deadline abort ────────────────────────────────────
  app.post("/api/scan/abort", (req: Request, res: Response) => {
    const { scanId, reason } = req.body || {};
    if (!scanId) {
      return res.status(400).json({ error: "scanId is required" });
    }
    return res.json({
      scanId,
      aborted: true,
      reason: reason ?? "deadline_exceeded",
      abortedAt: new Date().toISOString(),
    });
  });

  // ── GET /api/scan/:id/deadline — deadline status ─────────────────────────────
  app.get("/api/scan/:id/deadline", (req: Request, res: Response) => {
    const { id } = req.params;
    const remainingMs = Number(req.query.remainingMs ?? 5000);
    return res.json({
      scanId: id,
      deadlineAt: new Date(Date.now() + remainingMs).toISOString(),
      remainingMs,
      shouldAbort: remainingMs < 15_000,
    });
  });

  // ── POST /api/capture — anti-bot capture ────────────────────────────────────
  app.post("/api/capture", (req: Request, res: Response) => {
    const { failureMode } = req.body || {};

    const failureModes: Record<string, object> = {
      fetch_failed: {
        success: false,
        analysisState: "needs_review",
        failureCategory: "fetch_failed",
        statusCode: 0,
        headers: {},
        consoleLog: "net::ERR_CONNECTION_REFUSED",
      },
      render_failed: {
        success: false,
        analysisState: "needs_review",
        failureCategory: "render_failed",
        statusCode: 200,
        headers: { "content-type": "text/html" },
        consoleLog: "Page render timed out after 10000ms",
      },
      blocked_by_target: {
        success: false,
        analysisState: "needs_review",
        failureCategory: "blocked_by_target",
        statusCode: 403,
        headers: { "cf-ray": "abc123", server: "cloudflare" },
        consoleLog: "Access denied by target server",
      },
      incomplete_evidence: {
        success: false,
        analysisState: "needs_review",
        failureCategory: "incomplete_evidence",
        statusCode: 200,
        headers: {},
        consoleLog: "Screenshot captured but HTML snapshot empty",
      },
    };

    if (failureMode && failureModes[failureMode]) {
      return res.status(422).json(failureModes[failureMode]);
    }

    // Happy path
    return res.json({
      success: true,
      analysisState: "success",
      screenshotUrl: signedUrl("evidence/screenshots/threat_demo.png"),
      htmlSnapshotUrl: signedUrl("evidence/html/threat_demo.html"),
    });
  });

  // ── POST /api/claude/analyze — Claude analysis with schema validation ─────────
  app.post("/api/claude/analyze", (req: Request, res: Response) => {
    const { threatId, evidence, injectBadOutput } = req.body || {};

    if (!threatId) {
      return res.status(400).json({ error: "threatId is required" });
    }
    if (!evidence) {
      return res.status(400).json({ error: "evidence is required" });
    }

    if (injectBadOutput) {
      return res.status(422).json({
        threatId,
        analysisState: "needs_review",
        analysis: null,
        validationErrors: injectBadOutput.errors ?? ["threatScore out of range"],
        rawModelOutput: injectBadOutput.raw ?? "{ invalid json }",
        reason: "Claude output failed schema validation",
        durationMs: 1234,
      });
    }

    return res.json({
      threatId,
      analysisState: "success",
      analysis: VALID_CLAUDE_OUTPUT,
      validationErrors: null,
      rawModelOutput: null,
      reason: null,
      durationMs: 3200,
    });
  });

  // ── POST /api/takedown/generate ──────────────────────────────────────────────
  app.post("/api/takedown/generate", (req: Request, res: Response) => {
    const { reviewerName, invalidModelOutput } = req.body || {};

    if (invalidModelOutput) {
      return res.status(422).json({ error: "schema_validation_failed" });
    }

    return res.json({
      reportId: "report_A",
      threatId: TENANT_A.threatId,
      reportStatus: reviewerName ? "approved" : "review_required",
      generatedAt: new Date().toISOString(),
      evidence: {
        screenshotUrl: signedUrl("evidence/screenshots/threat_A.png"),
        htmlSnapshotUrl: signedUrl("evidence/html/threat_A.html"),
      },
    });
  });

  return { app };
};
