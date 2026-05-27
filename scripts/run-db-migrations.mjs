import { readdirSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = resolve(rootDir, 'db', 'migrations');
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL or SUPABASE_DB_URL is required to run migrations.');
  process.exit(1);
}

let migrationFiles;

try {
  migrationFiles = readdirSync(migrationsDir)
    .filter((fileName) => extname(fileName) === '.sql')
    .sort((left, right) => left.localeCompare(right));
} catch (error) {
  console.error(`Unable to read migration directory at ${migrationsDir}.`);
  throw error;
}

if (migrationFiles.length === 0) {
  console.log(`No SQL migrations found in ${migrationsDir}.`);
  process.exit(0);
}

for (const fileName of migrationFiles) {
  const migrationPath = resolve(migrationsDir, fileName);
  console.log(`Applying ${fileName}...`);

  const result = spawnSync(
    'psql',
    ['--set', 'ON_ERROR_STOP=on', databaseUrl, '-f', migrationPath],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );

  if (result.status !== 0) {
    console.error(`Migration failed: ${fileName}`);
    process.exit(result.status ?? 1);
  }
}

console.log('Database migrations completed successfully.');