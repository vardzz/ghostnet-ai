import { NextRequest, NextResponse } from "next/server";
import { discoverSerpEvidence } from "@/lib/brightdata/serp-client";
import { capturePage, type EvidenceBundle } from "@/lib/brightdata/scraping-browser-client";
import { getGeminiModel } from "@/lib/gemini/model";
import { join } from "path";
import { tmpdir } from "os";

type SearchResult = {
  url: string;
  title: string;
  snippet: string;
  source: "Google" | "Bing" | "Bright Data SERP";
  query: string;
  evidence?: EvidenceBundle;
};

export async function POST(req: NextRequest) {
  const { brandName } = await req.json();

  if (!brandName?.trim()) {
    return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  }

  try {
    const [googleResults, bingResults] = await Promise.allSettled([
      searchGoogle(brandName),
      searchBing(brandName),
    ]);

    const rawResults = [
      ...(googleResults.status === "fulfilled" ? googleResults.value : []),
      ...(bingResults.status === "fulfilled" ? bingResults.value : []),
    ];

    const seen = new Set<string>();
    const deduplicated = rawResults.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    const evidenceResults = await captureSuspiciousEvidence(brandName, deduplicated);

    const threatReport = await analyzeWithGemini(brandName, evidenceResults);

    if (threatReport && threatReport.scanSummary) {
      threatReport.scanSummary.scanDate = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      });
    }

    return NextResponse.json(threatReport);
  } catch (err) {
    return NextResponse.json(
      { error: "Scan failed", details: String(err) },
      { status: 500 }
    );
  }
}

async function searchGoogle(brandName: string): Promise<SearchResult[]> {
  const results = await discoverSerpEvidence({
    brandName,
    limit: 10,
    endpoint: process.env.BRIGHTDATA_ZONE_SERP,
  });

  return results.map((item) => ({
    url: item.url,
    title: item.title,
    snippet: item.snippet,
    source: "Google" as const,
    query: item.query,
  }));
}

async function searchBing(brandName: string): Promise<SearchResult[]> {
  const results = await discoverSerpEvidence({
    brandName,
    limit: 8,
    endpoint: process.env.BRIGHTDATA_ZONE_SERP,
  });

  return results.map((item) => ({
    url: item.url,
    title: item.title,
    snippet: item.snippet,
    source: "Bing" as const,
    query: item.query,
  }));
}

async function captureSuspiciousEvidence(brandName: string, results: SearchResult[]) {
  const candidates = selectCaptureCandidates(brandName, results).slice(0, 3);

  if (candidates.length === 0) {
    return results;
  }

  const captured = await Promise.allSettled(
    candidates.map(async (candidate, index) => {
      const outputDir = join(tmpdir(), "ghostnet-ai", "scan", sanitizeSegment(brandName), `${Date.now()}-${index}`);
      const evidence = await capturePage({
        url: candidate.url,
        outputDir,
        timeoutMs: 15_000,
        maxVisibleItems: 12,
      });

      return {
        url: candidate.url,
        evidence,
      };
    }),
  );

  const evidenceByUrl = new Map<string, EvidenceBundle>();
  for (const item of captured) {
    if (item.status === "fulfilled") {
      evidenceByUrl.set(item.value.url, item.value.evidence);
    }
  }

  return results.map((result) => ({
    ...result,
    evidence: evidenceByUrl.get(result.url),
  }));
}

function selectCaptureCandidates(brandName: string, results: SearchResult[]) {
  const loweredBrand = brandName.toLowerCase();
  const suspiciousKeywords = ["login", "signin", "sign in", "verify", "account", "secure", "wallet", "support", "password", "shop", "store"];

  return [...results]
    .map((result) => {
      const haystack = `${result.url} ${result.title} ${result.snippet}`.toLowerCase();
      let score = 0;

      if (!haystack.includes(loweredBrand)) score += 20;
      if (suspiciousKeywords.some((keyword) => haystack.includes(keyword))) score += 30;
      if (haystack.includes("-") || haystack.includes("_")) score += 10;
      if (result.snippet.trim().length > 0) score += 5;

      return { result, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.result);
}

function sanitizeSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "brand";
}

async function analyzeWithGemini(brandName: string, results: SearchResult[]) {
  const prompt = `
You are a brand protection analyst for GhostNet AI.

You have been given a list of URLs and web results discovered by scraping 
Google and Bing. Your job is to analyze these results and determine which 
ones are suspicious, potentially impersonating, or threatening to the 
brand "${brandName}".

Here are the scraped results:
${JSON.stringify(results, null, 2)}

Here are the captured page evidence bundles for the highest-signal targets:
${JSON.stringify(
  results
    .filter((result) => result.evidence)
    .map((result) => ({
      url: result.url,
      title: result.title,
      source: result.source,
      query: result.query,
      evidence: result.evidence,
    })),
  null,
  2,
)}

Analyze every result and return ONLY a valid JSON object with this exact schema.
No explanation. No markdown. No code fences. JSON only.

{
  "brandName": "${brandName}",
  "scanSummary": {
    "totalScanned": <number of URLs analyzed>,
    "threatsFound": <number of suspicious URLs>,
    "safeDomains": <number of clean/safe URLs>,
    "scanDate": "<today's date in Month DD, YYYY format>",
    "overallRiskLevel": "<Critical | High | Medium | Low>",
    "overallRiskExplanation": "<2-3 sentence plain English explanation of the overall risk to the brand>"
  },
  "threats": [
    {
      "url": "<suspicious URL>",
      "title": "<page title>",
      "source": "<Google or Bing>",
      "threatScore": <0-100>,
      "urgency": "<Critical | High | Medium | Low>",
      "threatType": "<Phishing | Brand Impersonation | Fake Store | Credential Harvesting | Typosquatting | Suspicious>",
      "whatIsHappening": "<1-2 sentence plain English explanation of what this site is doing wrong, written for a non-technical user>",
      "whyItsDangerous": "<1-2 sentence explanation of the risk this poses to the brand and its customers>",
      "recommendedAction": "<Takedown Request | Report to Registrar | Report to Google | Monitor Only | Flag for Review>",
      "registrarHint": "<likely registrar if detectable from URL, else null>",
      "abuseContactHint": "<likely abuse email or report URL, else null>"
    }
  ],
  "safeDomainsList": [
    {
      "url": "<safe URL>",
      "reason": "<one sentence explaining why this was considered safe>"
    }
  ],
  "recommendedNextSteps": [
    "<step 1 in plain English>",
    "<step 2 in plain English>",
    "<step 3 in plain English>"
  ]
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "<unreadable>");

    if (response.status === 429) {
      return buildFallbackThreatReport(
        brandName,
        results,
        `Gemini quota exceeded: ${details}`
      );
    }

    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${details}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return buildFallbackThreatReport(
      brandName,
      results,
      `Gemini returned an unexpected response shape: ${JSON.stringify(data)}`
    );
  }

  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return buildFallbackThreatReport(
      brandName,
      results,
      "Gemini returned non-JSON output"
    );
  }
}

function buildFallbackThreatReport(
  brandName: string,
  results: SearchResult[],
  reason: string
) {
  const loweredBrand = brandName.toLowerCase();
  const suspiciousKeywords = [
    "login",
    "signin",
    "sign in",
    "verify",
    "account",
    "secure",
    "wallet",
    "support",
    "password",
    "offer",
    "promo",
    "deal",
    "shop",
    "store",
  ];

  const scored = results.map((result) => {
    const urlText = `${result.url} ${result.title} ${result.snippet}`.toLowerCase();
    let threatScore = 15;

    if (!urlText.includes(loweredBrand)) threatScore += 20;
    if (suspiciousKeywords.some((keyword) => urlText.includes(keyword))) {
      threatScore += 30;
    }
    if (urlText.includes("-")) {
      threatScore += 5;
    }

    const urgency = threatScore >= 80 ? "Critical" : threatScore >= 60 ? "High" : threatScore >= 35 ? "Medium" : "Low";
    const threatType = urlText.includes("login") || urlText.includes("password")
      ? "Credential Harvesting"
      : urlText.includes("shop") || urlText.includes("store")
        ? "Fake Store"
        : urlText.includes("verify")
          ? "Phishing"
          : "Suspicious";

    return {
      ...result,
      threatScore: Math.min(100, threatScore),
      urgency,
      threatType,
    };
  });

  const threats = scored
    .filter((item) => item.threatScore >= 35)
    .map((item) => ({
      url: item.url,
      title: item.title,
      source: item.source,
      threatScore: item.threatScore,
      urgency: item.urgency,
      threatType: item.threatType,
      whatIsHappening: `This result looks related to ${brandName} and includes signals that often appear in impersonation or credential-theft attempts.`,
      whyItsDangerous: `If this is not an official domain, it could mislead users into sharing credentials or personal information with a third party.`,
      recommendedAction: item.threatScore >= 80 ? "Takedown Request" : item.threatScore >= 60 ? "Report to Registrar" : "Flag for Review",
      registrarHint: null,
      abuseContactHint: null,
    }));

  const safeDomainsList = scored
    .filter((item) => item.threatScore < 35)
    .slice(0, 5)
    .map((item) => ({
      url: item.url,
      reason: "No obvious impersonation or credential-harvesting indicators were detected in the title or snippet.",
    }));

  return {
    brandName,
    scanSummary: {
      totalScanned: results.length,
      threatsFound: threats.length,
      safeDomains: safeDomainsList.length,
      scanDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
      overallRiskLevel:
        threats.some((item) => item.urgency === "Critical")
          ? "Critical"
          : threats.some((item) => item.urgency === "High")
            ? "High"
            : threats.some((item) => item.urgency === "Medium")
              ? "Medium"
              : "Low",
      overallRiskExplanation:
        `Gemini analysis was unavailable, so this report was generated from scraped search evidence and heuristic risk scoring. ${reason}`,
    },
    threats,
    safeDomainsList,
    recommendedNextSteps: [
      "Review the highest-scoring domains first and verify whether they are official brand properties.",
      "If a domain appears impersonating, submit registrar and hosting abuse reports immediately.",
      "Re-run the scan after Gemini quota is restored to get a full model-assisted analysis.",
    ],
  };
}