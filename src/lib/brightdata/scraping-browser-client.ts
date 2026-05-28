import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type CaptureStatus =
  | "captured"
  | "fetch_failed"
  | "render_failed"
  | "blocked_by_target"
  | "incomplete_evidence";

type AnalysisState = "pending" | "needs_review";

type HeaderMap = Record<string, string>;

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  url?: string;
  text(): Promise<string>;
  headers?:
    | HeaderMap
    | {
        forEach(callback: (value: string, key: string) => void): void;
      };
};

type FetchLike = (
  input: string,
  init?: { redirect?: "follow" | "manual" | "error"; signal?: AbortSignal },
) => Promise<FetchLikeResponse>;

type PlaywrightLike = {
  chromium: {
    launch(options?: { headless?: boolean }): Promise<{
      newContext(options?: { viewport?: { width: number; height: number } }): Promise<{
        newPage(): Promise<PlaywrightPageLike>;
        close(): Promise<void>;
      }>;
      close(): Promise<void>;
    }>;
  };
};

type PlaywrightPageLike = {
  setDefaultNavigationTimeout(timeoutMs: number): void;
  goto(
    url: string,
    options?: { waitUntil?: "networkidle" | "load" | "domcontentloaded"; timeout?: number },
  ): Promise<{ status(): number; headers(): HeaderMap } | null>;
  url(): string;
  title(): Promise<string>;
  screenshot(options: { path: string; fullPage: boolean }): Promise<void>;
  content(): Promise<string>;
  $$eval<T>(selector: string, fn: (nodes: any[]) => T): Promise<T>;
  on?(event: "console", handler: (message: { text(): string }) => void): void;
};

export interface EvidenceBundle {
  targetUrl: string;
  finalUrl: string;
  pageTitle: string;
  screenshotPath: string;
  htmlSnapshotPath: string;
  visibleText: string[];
  formSelectors: string[];
  capturedAt: string;
  status: CaptureStatus;
  analysisState: AnalysisState;
  retryCount: number;
  blockedStatusCode?: number;
  blockedHeaders?: HeaderMap;
  consoleSnippet?: string;
}

export interface CapturePageOptions {
  url: string;
  outputDir?: string;
  timeoutMs?: number;
  maxVisibleItems?: number;
  fetchImpl?: FetchLike;
  webUnlockerFetchImpl?: FetchLike;
  playwrightModule?: PlaywrightLike;
}

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
const BLOCKED_HINTS = [
  /captcha/i,
  /access denied/i,
  /blocked/i,
  /verify you are human/i,
  /cloudflare/i,
  /turnstile/i,
  /robot check/i,
];

function toHeaderMap(headers?: FetchLikeResponse["headers"]): HeaderMap {
  if (!headers) {
    return {};
  }

  if (typeof (headers as { forEach?: unknown }).forEach === "function") {
    const normalized: HeaderMap = {};
    (headers as { forEach(callback: (value: string, key: string) => void): void }).forEach(
      (value, key) => {
        normalized[key.toLowerCase()] = value;
      },
    );
    return normalized;
  }

  return Object.fromEntries(
    Object.entries(headers as HeaderMap).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function readSignalSnippet(text: string, maxLength = 200): string {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function readVisibleText(rawHtml: string, limit: number): string[] {
  return Array.from(
    new Set(
      (rawHtml.match(/>([^<>]{2,200})</g) || []).map((match: string) =>
        match.replace(/^>/, "").replace(/<$/, "").trim(),
      ),
    ),
  ).slice(0, limit);
}

function readFormSelectors(rawHtml: string, limit: number): string[] {
  return Array.from(
    new Set(rawHtml.match(/<\s*(form|input|button|textarea|select)([^>]*)>/gi) || []),
  ).slice(0, limit);
}

function isBlockedResponse(
  status: number,
  bodyText: string,
  headers: HeaderMap,
): boolean {
  if ([403, 429, 451].includes(status)) {
    return true;
  }

  const lowerBody = bodyText.toLowerCase();
  return BLOCKED_HINTS.some((pattern) => pattern.test(bodyText))
    || Object.entries(headers).some(([key, value]) =>
      /(captcha|blocked|challenge|cf-|ratelimit|robot)/i.test(`${key}:${value}`),
    )
    || /captcha|blocked|challenge|robot|cloudflare/.test(lowerBody);
}

function createTransparentEvidenceArtifacts(outputDir: string) {
  const id = `${Date.now()}`;
  const htmlPath = resolve(outputDir, `${id}.html`);
  const screenshotPath = resolve(outputDir, `${id}.png`);
  return { htmlPath, screenshotPath };
}

async function writePlaceholderScreenshot(screenshotPath: string): Promise<void> {
  const pngBuffer = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");
  await writeFile(screenshotPath, pngBuffer);
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<FetchLikeResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCapture(
  url: string,
  outputDir: string,
  timeoutMs: number,
  maxVisibleItems: number,
  fetchImpl: FetchLike,
  webUnlockerFetchImpl?: FetchLike,
): Promise<EvidenceBundle> {
  const capturedAt = new Date().toISOString();
  const { htmlPath, screenshotPath } = createTransparentEvidenceArtifacts(outputDir);

  let retryCount = 0;
  let firstResponseHeaders: HeaderMap = {};
  let firstStatus = 0;
  let finalUrl = url;
  let html = "";
  let blocked = false;

  try {
    const firstResponse = await fetchWithTimeout(fetchImpl, url, timeoutMs);
    firstStatus = firstResponse.status;
    firstResponseHeaders = toHeaderMap(firstResponse.headers);
    finalUrl = firstResponse.url || url;
    html = await firstResponse.text();
    blocked = isBlockedResponse(firstStatus, html, firstResponseHeaders);

    if (blocked && webUnlockerFetchImpl) {
      retryCount = 1;
      const fallbackResponse = await fetchWithTimeout(webUnlockerFetchImpl, url, timeoutMs);
      finalUrl = fallbackResponse.url || finalUrl;
      const fallbackText = await fallbackResponse.text();
      if (fallbackText.trim().length > 0) {
        html = fallbackText;
      }
    }

    await writeFile(htmlPath, html || "", "utf-8");
    await writePlaceholderScreenshot(screenshotPath);

    const visibleText = readVisibleText(html, maxVisibleItems);
    const formSelectors = readFormSelectors(html, 20);

    const status: CaptureStatus = blocked
      ? "blocked_by_target"
      : html.trim().length === 0 || (visibleText.length === 0 && formSelectors.length === 0)
        ? "incomplete_evidence"
        : "captured";

    return {
      targetUrl: url,
      finalUrl,
      pageTitle: "",
      screenshotPath,
      htmlSnapshotPath: htmlPath,
      visibleText,
      formSelectors,
      capturedAt,
      status,
      analysisState: status === "captured" ? "pending" : "needs_review",
      retryCount,
      blockedStatusCode: blocked ? firstStatus : undefined,
      blockedHeaders: blocked ? firstResponseHeaders : undefined,
      consoleSnippet: blocked ? "blocked during fetch; console logs unavailable" : undefined,
    };
  } catch (err) {
    await writeFile(htmlPath, html || "", "utf-8").catch(() => undefined);
    await writePlaceholderScreenshot(screenshotPath).catch(() => undefined);

    return {
      targetUrl: url,
      finalUrl,
      pageTitle: "",
      screenshotPath,
      htmlSnapshotPath: htmlPath,
      visibleText: [],
      formSelectors: [],
      capturedAt,
      status: "fetch_failed",
      analysisState: "needs_review",
      retryCount,
      consoleSnippet: err instanceof Error ? readSignalSnippet(err.message) : String(err),
    };
  }
}

async function playwrightCapture(
  url: string,
  outputDir: string,
  timeoutMs: number,
  maxVisibleItems: number,
  playwrightModule: PlaywrightLike,
): Promise<EvidenceBundle> {
  const capturedAt = new Date().toISOString();
  const { htmlPath, screenshotPath } = createTransparentEvidenceArtifacts(outputDir);
  const consoleMessages: string[] = [];

  const browser = await playwrightModule.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(timeoutMs);
  page.on?.("console", (message) => {
    consoleMessages.push(message.text());
  });

  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    const finalUrl = page.url();
    const pageTitle = await page.title().catch(() => "");
    const html = await page.content();
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    await writeFile(htmlPath, html, "utf-8");

    const responseHeaders = toHeaderMap(response ? response.headers() : undefined);
    const responseStatus = response?.status?.() ?? 0;
    const visibleText = (await page.$$eval("*:not(script):not(style)", (nodes: any[]) =>
      nodes.map((node) => (node.textContent || "").trim()).filter(Boolean).slice(0, 200),
    )) as string[];
    const formSelectors = (await page.$$eval("form, input, button, textarea, select", (nodes: any[]) =>
      nodes.map((node) => {
        const tag = (node.tagName || "").toLowerCase();
        const name = node.getAttribute?.("name") || node.getAttribute?.("id") || "";
        return name ? `${tag}[${name}]` : tag;
      }).slice(0, 20),
    )) as string[];

    const blocked = isBlockedResponse(responseStatus, html, responseHeaders);
    const incomplete = !blocked && (html.trim().length === 0 || (visibleText.length === 0 && formSelectors.length === 0));

    const status: CaptureStatus = blocked
      ? "blocked_by_target"
      : incomplete
        ? "incomplete_evidence"
        : "captured";

    return {
      targetUrl: url,
      finalUrl,
      pageTitle,
      screenshotPath,
      htmlSnapshotPath: htmlPath,
      visibleText: visibleText.slice(0, maxVisibleItems),
      formSelectors,
      capturedAt,
      status,
      analysisState: status === "captured" ? "pending" : "needs_review",
      retryCount: 0,
      blockedStatusCode: blocked ? responseStatus : undefined,
      blockedHeaders: blocked ? responseHeaders : undefined,
      consoleSnippet: blocked ? readSignalSnippet(consoleMessages.join(" | ")) : undefined,
    };
  } catch (err) {
    await writeFile(htmlPath, "", "utf-8").catch(() => undefined);
    await writePlaceholderScreenshot(screenshotPath).catch(() => undefined);
    return {
      targetUrl: url,
      finalUrl: page.url(),
      pageTitle: await page.title().catch(() => ""),
      screenshotPath,
      htmlSnapshotPath: htmlPath,
      visibleText: [],
      formSelectors: [],
      capturedAt,
      status: "render_failed",
      analysisState: "needs_review",
      retryCount: 0,
      consoleSnippet: readSignalSnippet(consoleMessages.join(" | ")) ||
        (err instanceof Error ? readSignalSnippet(err.message) : String(err)),
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function capturePage(options: CapturePageOptions): Promise<EvidenceBundle> {
  const {
    url,
    outputDir = "docs/samples/evidence",
    timeoutMs = 20_000,
    maxVisibleItems = 20,
    fetchImpl = globalThis.fetch as unknown as FetchLike,
    webUnlockerFetchImpl,
    playwrightModule,
  } = options;

  await mkdir(outputDir, { recursive: true });

  try {
    let resolvedPlaywright: PlaywrightLike | null = playwrightModule ?? null;
    if (!resolvedPlaywright) {
      try {
        resolvedPlaywright = require("playwright") as PlaywrightLike;
      } catch {
        resolvedPlaywright = null;
      }
    }
    if (resolvedPlaywright) {
      return await playwrightCapture(
        url,
        outputDir,
        timeoutMs,
        maxVisibleItems,
        resolvedPlaywright as PlaywrightLike,
      );
    }
  } catch {
    // fall through to fetch path
  }

  return fetchCapture(url, outputDir, timeoutMs, maxVisibleItems, fetchImpl, webUnlockerFetchImpl);
}
