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
const DEFAULT_SERP_ENDPOINT = "https://api.brightdata.com/datasets/v3/trigger";

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
      const title = readString(item, ["title", "name", "heading"]);
      const url = readString(item, ["url", "link", "displayed_link"]);
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
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function querySerp(
  query: string,
  apiKey: string,
  endpoint: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<RawSerpItem[]> {
  const requestBody = {
    query,
    limit: DEFAULT_LIMIT,
  };

  const response = await fetchWithTimeout(
    fetchImpl,
    endpoint,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
    timeoutMs,
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`SERP request failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as unknown;
  return extractItemsFromResponse(payload);
}

export async function discoverSerpEvidence(
  options: DiscoverSerpOptions,
): Promise<SerpEvidenceRecord[]> {
  const {
    brandName,
    permutations = [],
    limit = DEFAULT_LIMIT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    endpoint = process.env.BRIGHTDATA_SERP_ENDPOINT ?? DEFAULT_SERP_ENDPOINT,
    apiKey =
      process.env.BRIGHTDATA_API_KEY ?? process.env.BRIGHT_DATA_SERP_API_KEY ?? "",
    fetchImpl = fetch,
  } = options;

  if (!brandName.trim()) {
    throw new Error("brandName is required for SERP discovery");
  }

  if (!apiKey) {
    throw new Error(
      "Missing Bright Data API key. Set BRIGHTDATA_API_KEY or BRIGHT_DATA_SERP_API_KEY.",
    );
  }

  const queries = buildDiscoveryQueries(brandName, permutations);
  const discoveredAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const results: SerpEvidenceRecord[] = [];
  let lastError: Error | undefined;

  for (const query of queries) {
    if (results.length >= limit) {
      break;
    }

    try {
      const records = await querySerp(query, apiKey, endpoint, timeoutMs, fetchImpl);

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