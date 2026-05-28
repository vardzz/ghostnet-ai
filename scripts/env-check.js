const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BRIGHTDATA_API_KEY',
  'BRIGHT_DATA_SERP_API_KEY',
  'GEMINI_API_KEY'
];

const missingVars = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar]);
const hasBrightDataEndpoint = Boolean(process.env.BRIGHTDATA_SERP_ENDPOINT?.trim());
const hasBrightDataZone = Boolean(process.env.BRIGHTDATA_ZONE_SERP?.trim());

if (!hasBrightDataZone) {
  missingVars.push('BRIGHTDATA_ZONE_SERP');
}

if (missingVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', 'Build blocked: missing required environment variables.');
  missingVars.forEach((envVar) => {
    console.error(`- ${envVar}`);
  });
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', 'Environment check passed. All required variables are set.');
process.exit(0);