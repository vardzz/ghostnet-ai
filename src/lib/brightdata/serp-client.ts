import {
  canRetryTransientFetch,
  hasEnoughScanBudget,
  isTransientFetchError,
  TransientFetchError,
} from "../scan-budget";

export interface SerpEvidenceRecord {
  query: string;
  title: string;
  url: string;
  snippet: string;
  rank: number;
  discoveredAt: string;
}

export interface DiscoverSerpOptions {
  brandName: string;
  permutations?: string[];
  limit?: number;
  timeoutMs?: number;
  endpoint?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  deadlineAt?: string;
  signal?: AbortSignal;
  debugCollector?: (entry: {
    query: string;
    keys: string[];
    organicCount: number;
    sample?: Record<string, unknown>;
  }) => void;
}

interface RawSerpItem {
  title: string;
  url: string;
  snippet: string;
  rank?: number;
}

const DEFAULT_SIGNAL_TERMS = ["login", "support", "verify", "wallet", "security"];
const DEFAULT_LIMIT = 8;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_SERP_REQUEST_ENDPOINT = "https://api.brightdata.com/request";

export function resolveBrightDataSerpZone(explicitZone?: string): string {
  const configuredZone = explicitZone?.trim() || process.env.BRIGHTDATA_ZONE_SERP?.trim();

  if (!configuredZone) {
    throw new Error("Missing Bright Data SERP zone. Set BRIGHTDATA_ZONE_SERP.");
  }

  return configuredZone;
}

export function resolveBrightDataApiKey(explicitApiKey?: string): string {
  const configuredApiKey =
    explicitApiKey?.trim() ||
    process.env.BRIGHTDATA_API_KEY?.trim() ||
    process.env.BRIGHT_DATA_SERP_API_KEY?.trim();

  if (!configuredApiKey) {
    throw new Error(
      "Missing Bright Data API key. Set BRIGHTDATA_API_KEY or BRIGHT_DATA_SERP_API_KEY.",
    );
  }

  return configuredApiKey;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export function buildDiscoveryQueries(
  brandName: string,
  permutations: string[] = [],
): string[] {
  const sanitizedBrand = brandName.trim();
  const variants = Array.from(
    new Set(
      [sanitizedBrand, ...permutations]
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toLowerCase()),
    ),
  );

  const queries = variants.flatMap((variant) =>
    DEFAULT_SIGNAL_TERMS.map((term) => `${variant} ${term}`),
  );

  return Array.from(new Set(queries));
}

function readString(
  item: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumber(
  item: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractItemsFromResponse(payload: unknown): RawSerpItem[] {
  if (isRecord(payload)) {
    const body = payload.body;

    if (typeof body === "string" && body.trim().length > 0) {
      try {
        const parsedBody = JSON.parse(body) as unknown;
        return extractItemsFromResponse(parsedBody);
      } catch {
        // Fall through and try the wrapper object fields below.
      }
    }

    if (isRecord(body) || Array.isArray(body)) {
      return extractItemsFromResponse(body);
    }
  }

  const candidates: unknown[] = [];

  const pushIfArray = (value: unknown) => {
    if (Array.isArray(value)) {
      candidates.push(...value);
    }
  };

  if (Array.isArray(payload)) {
    candidates.push(...payload);
  }

  if (isRecord(payload)) {
    pushIfArray(payload.results);
    pushIfArray(payload.organic);
    pushIfArray(payload.items);
    pushIfArray(payload.data);
    pushIfArray(payload.news);
    pushIfArray(payload.videos);
    pushIfArray(payload.images);
    pushIfArray(payload.shopping);
    pushIfArray(payload.related);
    pushIfArray(payload.perspectives);
    pushIfArray(payload.latest_posts);

    if (Array.isArray(payload.tasks)) {
      for (const task of payload.tasks) {
        if (!isRecord(task)) {
          continue;
        }
        pushIfArray(task.result);
        if (Array.isArray(task.result)) {
          for (const result of task.result) {
            if (!isRecord(result)) {
              continue;
            }
            pushIfArray(result.items);
            pushIfArray(result.organic);
          }
        }
      }
    }
  }

  return candidates
    .filter(isRecord)
    .map((item) => {
      const title = readString(item, ["title", "name", "heading", "question"]);
      const url = readString(item, ["url", "link", "href", "display_link"]);
      const snippet = readString(item, ["snippet", "description", "text"]) ?? "";
      const rank = readNumber(item, ["rank", "position", "pos"]);

      return {
        title: title ?? "Untitled result",
        url: url ?? "",
        snippet,
        rank,
      };
    })
    .filter((item) => item.url.startsWith("http"));
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const cleanup: Array<() => void> = [];
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  cleanup.push(() => clearTimeout(timeout));

  if (signal) {
    if (signal.aborted) {
      controller.abort((signal as AbortSignal & { reason?: unknown }).reason ?? new Error("Aborted"));
    } else {
      const onAbort = () => {
        controller.abort((signal as AbortSignal & { reason?: unknown }).reason ?? new Error("Aborted"));
      };

      signal.addEventListener("abort", onAbort, { once: true });
      cleanup.push(() => signal.removeEventListener("abort", onAbort));
    }
  }

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    cleanup.forEach((release) => release());
  }
}

async function querySerp(
  query: string,
  apiKey: string,
  zone: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
  debugCollector?: DiscoverSerpOptions["debugCollector"],
): Promise<RawSerpItem[]> {
  const targetUrl = query.startsWith("http://") || query.startsWith("https://")
    ? query
    : `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  let response: Response;

  try {
    response = await fetchWithTimeout(
      fetchImpl,
      DEFAULT_SERP_REQUEST_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zone,
          url: targetUrl,
          format: "json",
        }),
      },
      timeoutMs,
      signal,
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new TransientFetchError(
      `SERP request failed for ${query}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    const details = await response.text();
    const message = `SERP request failed (${response.status}): ${details}`;

    if (isRetryableStatus(response.status)) {
      throw new TransientFetchError(message);
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as unknown;
  if (debugCollector && isRecord(payload)) {
    const organic = Array.isArray(payload.organic) ? payload.organic : [];
    debugCollector({
      query,
      keys: Object.keys(payload),
      organicCount: organic.length,
      sample: organic.length > 0 && isRecord(organic[0]) ? organic[0] : undefined,
    });
  }
  return extractItemsFromResponse(payload);
}

async function querySerpWithRetry(
  query: string,
  apiKey: string,
  zone: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
  deadlineAt?: string,
  signal?: AbortSignal,
  debugCollector?: DiscoverSerpOptions["debugCollector"],
): Promise<RawSerpItem[]> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await querySerp(query, apiKey, zone, timeoutMs, fetchImpl, signal, debugCollector);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isTransientFetchError(error) || !canRetryTransientFetch(deadlineAt, attempt)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(`SERP request failed for ${query}`);
}

export async function discoverSerpEvidence(
  options: DiscoverSerpOptions,
): Promise<SerpEvidenceRecord[]> {
  const {
    brandName,
    permutations = [],
    limit = DEFAULT_LIMIT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    endpoint,
    apiKey,
    fetchImpl = fetch,
    deadlineAt,
    signal,
    debugCollector,
  } = options;

  if (!brandName.trim()) {
    throw new Error("brandName is required for SERP discovery");
  }

  const resolvedApiKey = resolveBrightDataApiKey(apiKey);
  const resolvedZone = resolveBrightDataSerpZone(endpoint);

  const queries = buildDiscoveryQueries(brandName, permutations);
  const discoveredAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const results: SerpEvidenceRecord[] = [];
  let lastError: Error | undefined;

  for (const query of queries) {
    if (results.length >= limit) {
      break;
    }

    if (deadlineAt && !hasEnoughScanBudget(deadlineAt)) {
      break;
    }

    try {
      const records = await querySerpWithRetry(
        query,
        resolvedApiKey,
        resolvedZone,
        timeoutMs,
        fetchImpl,
        deadlineAt,
        signal,
        debugCollector,
      );

      records.forEach((record, index) => {
        if (results.length >= limit || seenUrls.has(record.url)) {
          return;
        }

        seenUrls.add(record.url);
        results.push({
          query,
          title: record.title,
          url: record.url,
          snippet: record.snippet,
          rank: record.rank ?? index + 1,
          discoveredAt,
        });
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (results.length === 0 && lastError) {
    throw new Error(`SERP discovery failed: ${lastError.message}`);
  }

  return results;
}