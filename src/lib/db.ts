import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { EvidenceBundle } from "@/lib/brightdata/scraping-browser-client";

export interface SavedEvidenceRecord {
  id: string;
  analysisState: "pending" | "needs_review";
  failureCategory: EvidenceBundle["status"];
  evidencePath: string;
  storedAt: string;
  evidence: EvidenceBundle;
  blockedStatusCode?: number;
  blockedHeaders?: Record<string, string>;
  consoleSnippet?: string;
}

export interface SaveEvidenceOptions {
  dbPath?: string;
  id?: string;
}

function defaultDbPath(): string {
  return resolve("docs", "samples", "db-records.json");
}

export async function saveEvidence(
  evidence: EvidenceBundle,
  options: SaveEvidenceOptions = {},
): Promise<SavedEvidenceRecord> {
  const dbPath = options.dbPath ?? defaultDbPath();
  const id = options.id ?? `${Date.now()}`;
  const storedAt = new Date().toISOString();
  const analysisState = evidence.status === "captured" ? "pending" : "needs_review";

  await mkdir(dirname(dbPath), { recursive: true });

  let existing: SavedEvidenceRecord[] = [];
  try {
    const raw = await readFile(dbPath, "utf-8");
    existing = JSON.parse(raw) as SavedEvidenceRecord[];
  } catch {
    existing = [];
  }

  const record: SavedEvidenceRecord = {
    id,
    analysisState,
    failureCategory: evidence.status,
    evidencePath: evidence.htmlSnapshotPath,
    storedAt,
    evidence,
    blockedStatusCode: evidence.blockedStatusCode,
    blockedHeaders: evidence.blockedHeaders,
    consoleSnippet: evidence.consoleSnippet,
  };

  existing.push(record);
  await writeFile(dbPath, JSON.stringify(existing, null, 2) + "\n", "utf-8");

  return record;
}
