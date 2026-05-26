import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  discoverSerpEvidence,
  type SerpEvidenceRecord,
} from "../src/lib/brightdata/serp-client";

const DEFAULT_BRAND = "GhostNet AI";
const DEFAULT_OUTPUT = "docs/samples/sample-evidence.json";
const DEFAULT_LIMIT = 8;

interface SampleEnvelope {
  brandName: string;
  permutations: string[];
  generatedAt: string;
  source: "brightdata_serp" | "mock";
  results: SerpEvidenceRecord[];
}

function parseArgs(): { brandName: string; permutations: string[] } {
  const [, , brandArg, ...permutationArgs] = process.argv;

  return {
    brandName: brandArg?.trim() || process.env.SERP_SAMPLE_BRAND || DEFAULT_BRAND,
    permutations: permutationArgs.length
      ? permutationArgs
      : (process.env.SERP_SAMPLE_PERMUTATIONS ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
  };
}

function buildMockEvidence(
  brandName: string,
  permutations: string[],
  discoveredAt: string,
): SerpEvidenceRecord[] {
  const variants = [brandName, ...permutations].filter(Boolean);
  const base = variants.length > 0 ? variants : [brandName];

  const synthetic = [
    "login",
    "support",
    "verify",
    "secure portal",
    "wallet",
    "account",
    "help center",
    "official",
  ];

  return synthetic.slice(0, DEFAULT_LIMIT).map((suffix, index) => {
    const variant = base[index % base.length].toLowerCase().replace(/\s+/g, "");
    return {
      query: `${variant} ${suffix}`,
      title: `${brandName} ${suffix} access`,
      url: `https://${variant}-${suffix.replace(/\s+/g, "-")}.example.com`,
      snippet:
        "Mock prototype result generated locally because Bright Data credentials were not available.",
      rank: index + 1,
      discoveredAt,
    };
  });
}

async function writeSample(outputPath: string, payload: SampleEnvelope): Promise<void> {
  const absolutePath = resolve(process.cwd(), outputPath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  console.log(`Wrote sample evidence to ${absolutePath}`);
}

async function main(): Promise<void> {
  const { brandName, permutations } = parseArgs();
  const outputPath = process.env.SERP_SAMPLE_OUTPUT ?? DEFAULT_OUTPUT;
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.BRIGHTDATA_API_KEY ?? process.env.BRIGHT_DATA_SERP_API_KEY;

  let source: SampleEnvelope["source"] = "brightdata_serp";
  let results: SerpEvidenceRecord[] = [];

  if (apiKey) {
    results = await discoverSerpEvidence({
      brandName,
      permutations,
      limit: DEFAULT_LIMIT,
      timeoutMs: 10_000,
      apiKey,
    });
  } else {
    source = "mock";
    results = buildMockEvidence(brandName, permutations, generatedAt);
    console.warn(
      "No Bright Data API key found; generated mock evidence. Set BRIGHTDATA_API_KEY for live SERP output.",
    );
  }

  await writeSample(outputPath, {
    brandName,
    permutations,
    generatedAt,
    source,
    results,
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to generate sample evidence: ${message}`);
  process.exit(1);
});