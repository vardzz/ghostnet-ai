import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { capturePage } from "@/lib/brightdata/scraping-browser-client";
import { saveEvidence } from "@/lib/db";

function createTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

function createResponse(overrides: {
  status: number;
  body: string;
  url?: string;
  headers?: Record<string, string>;
}) {
  return {
    ok: overrides.status >= 200 && overrides.status < 300,
    status: overrides.status,
    url: overrides.url ?? "https://target.test/page",
    headers: overrides.headers ?? {},
    text: jest.fn().mockResolvedValue(overrides.body),
  };
}

function createPageMock(options: {
  response: { status: number; headers?: Record<string, string> } | null;
  html: string;
  title?: string;
  url?: string;
  consoleMessages?: string[];
  gotoError?: Error;
}) {
  const consoleHandlers: Array<(message: { text(): string }) => void> = [];
  const consoleMessages = options.consoleMessages ?? [];

  const page = {
    setDefaultNavigationTimeout: jest.fn(),
    on: jest.fn((event: string, handler: (message: { text(): string }) => void) => {
      if (event === "console") {
        consoleHandlers.push(handler);
      }
    }),
    goto: jest.fn(async () => {
      consoleMessages.forEach((message) => {
        consoleHandlers.forEach((handler) => handler({ text: () => message }));
      });

      if (options.gotoError) {
        throw options.gotoError;
      }

      const response = options.response;
      if (!response) {
        return null;
      }

      return {
        status: () => response.status,
        headers: () => response.headers ?? {},
      };
    }),
    url: jest.fn(() => options.url ?? "https://target.test/page"),
    title: jest.fn(async () => options.title ?? "Target Title"),
    screenshot: jest.fn(async () => undefined),
    content: jest.fn(async () => options.html),
    $$eval: jest.fn(async (selector: string) => {
      if (selector === "*:not(script):not(style)") {
        return options.html.includes("Target Title") ? ["Target Title", "Continue"] : [];
      }

      if (selector === "form, input, button, textarea, select") {
        return options.html.includes("<form") ? ["<form id=\"login-form\">", "<button type=\"submit\">"] : [];
      }

      return [];
    }),
  };

  return {
    page,
    browser: {
      newContext: jest.fn(async () => ({
        newPage: jest.fn(async () => page),
        close: jest.fn(async () => undefined),
      })),
      close: jest.fn(async () => undefined),
    },
  };
}

describe("Day 3 anti-bot handling", () => {
  it("classifies blocked_by_target, captures console/status metadata, and saves a reviewable record", async () => {
    const tempDir = await createTempDir("ghostnet-blocked-");
    const dbPath = join(tempDir, "db-records.json");
    const playwright = createPageMock({
      response: {
        status: 403,
        headers: { "content-type": "text/html", "cf-ray": "ray-123" },
      },
      html: "<html><body><h1>Access denied</h1></body></html>",
      title: "Access denied",
      url: "https://target.test/page",
      consoleMessages: ["challenge triggered by bot check"],
    });

    const evidence = await capturePage({
      url: "https://target.test/page",
      outputDir: tempDir,
      playwrightModule: { chromium: { launch: jest.fn(async () => playwright.browser) } } as never,
    });

    const record = await saveEvidence(evidence, { dbPath });
    const persisted = JSON.parse(await readFile(dbPath, "utf-8")) as Array<{ analysisState: string }>;

    expect(evidence.status).toBe("blocked_by_target");
    expect(evidence.analysisState).toBe("needs_review");
    expect(evidence.blockedStatusCode).toBe(403);
    expect(evidence.blockedHeaders?.["cf-ray"]).toBe("ray-123");
    expect(evidence.consoleSnippet).toContain("challenge triggered by bot check");
    expect(record.analysisState).toBe("needs_review");
    expect(persisted[0].analysisState).toBe("needs_review");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns render_failed when Playwright navigation fails", async () => {
    const tempDir = await createTempDir("ghostnet-render-");
    const playwright = createPageMock({
      response: null,
      html: "",
      gotoError: new Error("render timeout"),
    });

    const evidence = await capturePage({
      url: "https://target.test/render-fail",
      outputDir: tempDir,
      playwrightModule: { chromium: { launch: jest.fn(async () => playwright.browser) } } as never,
    });

    expect(evidence.status).toBe("render_failed");
    expect(evidence.analysisState).toBe("needs_review");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns fetch_failed when the initial fetch rejects", async () => {
    const tempDir = await createTempDir("ghostnet-fetch-fail-");
    const evidence = await capturePage({
      url: "https://target.test/fetch-fail",
      outputDir: tempDir,
      fetchImpl: jest.fn(async () => {
        throw new Error("network down");
      }) as never,
    });

    expect(evidence.status).toBe("fetch_failed");
    expect(evidence.analysisState).toBe("needs_review");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns incomplete_evidence when the page loads but produces no usable body", async () => {
    const tempDir = await createTempDir("ghostnet-incomplete-");
    const evidence = await capturePage({
      url: "https://target.test/incomplete",
      outputDir: tempDir,
      fetchImpl: jest.fn(async () => createResponse({ status: 200, body: "" })) as never,
    });

    expect(evidence.status).toBe("incomplete_evidence");
    expect(evidence.analysisState).toBe("needs_review");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("retries with Web Unlocker exactly once when the target is blocked", async () => {
    const tempDir = await createTempDir("ghostnet-unlocker-");
    const fetchImpl = jest.fn(async () =>
      createResponse({
        status: 403,
        body: "<html><body>Access denied</body></html>",
        headers: { "content-type": "text/html" },
      }),
    );
    const webUnlockerFetchImpl = jest.fn(async () =>
      createResponse({
        status: 200,
        body: "<html><body><h1>Unlocked page</h1><form><input name=\"email\" /></form></body></html>",
        headers: { "content-type": "text/html" },
      }),
    );

    const evidence = await capturePage({
      url: "https://target.test/blocked",
      outputDir: tempDir,
      fetchImpl: fetchImpl as never,
      webUnlockerFetchImpl: webUnlockerFetchImpl as never,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(webUnlockerFetchImpl).toHaveBeenCalledTimes(1);
    expect(evidence.retryCount).toBe(1);
    expect(evidence.status).toBe("blocked_by_target");
    expect(evidence.analysisState).toBe("needs_review");
    expect(evidence.visibleText.join(" ")).toContain("Unlocked page");

    await rm(tempDir, { recursive: true, force: true });
  });
});
