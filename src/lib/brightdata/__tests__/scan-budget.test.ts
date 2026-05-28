const mockLaunch = jest.fn();
const mockNewPage = jest.fn();
const mockNewContext = jest.fn();
const mockBrowserClose = jest.fn();
const mockGoto = jest.fn();
const mockTitle = jest.fn();
const mockScreenshot = jest.fn();
const mockContent = jest.fn();
const mockVisibleEval = jest.fn();
const mockFormEval = jest.fn();

jest.mock(
  "playwright",
  () => ({
    chromium: {
      launch: mockLaunch,
    },
  }),
  { virtual: true },
);

import {
  discoverSerpEvidence,
  resolveBrightDataApiKey,
  resolveBrightDataSerpEndpoint,
} from "@/lib/brightdata/serp-client";
import { capturePage } from "@/lib/brightdata/scraping-browser-client";

describe("scan deadline and retry policy", () => {
  const originalEnv = {
    BRIGHTDATA_ZONE_SERP: process.env.BRIGHTDATA_ZONE_SERP,
    BRIGHTDATA_SERP_ENDPOINT: process.env.BRIGHTDATA_SERP_ENDPOINT,
    BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY,
    BRIGHT_DATA_SERP_API_KEY: process.env.BRIGHT_DATA_SERP_API_KEY,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BRIGHTDATA_ZONE_SERP = originalEnv.BRIGHTDATA_ZONE_SERP;
    process.env.BRIGHTDATA_SERP_ENDPOINT = originalEnv.BRIGHTDATA_SERP_ENDPOINT;
    process.env.BRIGHTDATA_API_KEY = originalEnv.BRIGHTDATA_API_KEY;
    process.env.BRIGHT_DATA_SERP_API_KEY = originalEnv.BRIGHT_DATA_SERP_API_KEY;

    mockGoto.mockResolvedValue(undefined);
    mockTitle.mockResolvedValue("Mock Page");
    mockScreenshot.mockResolvedValue(undefined);
    mockContent.mockResolvedValue("<html><body>Mock Page</body></html>");
    mockVisibleEval.mockResolvedValue(["Mock Page"]);
    mockFormEval.mockResolvedValue(["form"]);

    mockNewPage.mockResolvedValue({
      setDefaultNavigationTimeout: jest.fn(),
      goto: mockGoto,
      url: jest.fn().mockReturnValue("https://example.test/page"),
      title: mockTitle,
      screenshot: mockScreenshot,
      content: mockContent,
      $$eval: jest.fn((selector: string) => {
        if (selector === "*:not(script):not(style)") {
          return mockVisibleEval();
        }

        if (selector === "form, input, button, textarea, select") {
          return mockFormEval();
        }

        return Promise.resolve([]);
      }),
    });

    mockNewContext.mockResolvedValue({
      newPage: mockNewPage,
    });

    mockBrowserClose.mockResolvedValue(undefined);

    mockLaunch.mockResolvedValue({
      newContext: mockNewContext,
      close: mockBrowserClose,
    });
  });

  it("stops browser work when the scan deadline has already expired", async () => {
    const result = await capturePage({
      url: "https://example.test/login",
      outputDir: "docs/samples/evidence-tests/deadline-expired",
      deadlineAt: new Date(Date.now() - 1_000).toISOString(),
    });

    expect(result.status).toBe("incomplete_evidence");
    expect(mockLaunch).not.toHaveBeenCalled();
  });

  it("retries a transient SERP failure once when the budget is healthy", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "GhostNet result",
                url: "https://example.test/login",
                snippet: "login",
                rank: 1,
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const results = await discoverSerpEvidence({
      brandName: "GhostNet",
      apiKey: "test-key",
      endpoint: "https://example.test/serp",
      fetchImpl: fetchImpl as never,
      deadlineAt: new Date(Date.now() + 60_000).toISOString(),
      limit: 1,
    });

    expect(results).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry a transient fetch when the remaining budget is low", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      discoverSerpEvidence({
        brandName: "GhostNet",
        apiKey: "test-key",
        endpoint: "https://example.test/serp",
        fetchImpl: fetchImpl as never,
        deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        limit: 1,
      }),
    ).resolves.toEqual([]);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("resolves Bright Data config from the supported env vars", () => {
    process.env.BRIGHTDATA_ZONE_SERP = "serp-zone-123";
    delete process.env.BRIGHTDATA_SERP_ENDPOINT;
    delete process.env.BRIGHTDATA_API_KEY;
    delete process.env.BRIGHT_DATA_SERP_API_KEY;

    expect(resolveBrightDataSerpEndpoint()).toBe(
      "https://api.brightdata.com/datasets/v3/trigger?dataset_id=serp-zone-123",
    );

    process.env.BRIGHTDATA_API_KEY = "primary-key";
    expect(resolveBrightDataApiKey()).toBe("primary-key");
  });
});
