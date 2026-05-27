import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';

export interface SavedEvidenceRecord {
  id: string;
  evidencePath: string;
  storedAt: string;
}

const DB_DIR = resolve('docs', 'samples');
const DB_PATH = resolve(DB_DIR, 'db-records.json');

export async function saveEvidence(record: SavedEvidenceRecord): Promise<void> {
  await mkdir(DB_DIR, { recursive: true });
  let existing: SavedEvidenceRecord[] = [];
  try {
    const raw = await readFile(DB_PATH, 'utf-8');
    existing = JSON.parse(raw) as SavedEvidenceRecord[];
  } catch {
    existing = [];
  }

  existing.push(record);
  await writeFile(DB_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}
