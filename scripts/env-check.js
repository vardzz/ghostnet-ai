const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BRIGHT_DATA_SERP_API_KEY',
  'BRIGHT_DATA_WEB_UNLOCKER_PROXY',
  'CLAUDE_API_KEY'
];

const missingVars = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', 'Build blocked: missing required environment variables.');
  missingVars.forEach((envVar) => {
    console.error(`- ${envVar}`);
  });
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', 'Environment check passed. All required variables are set.');
process.exit(0);