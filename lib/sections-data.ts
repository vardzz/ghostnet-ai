export interface TechSection {
  id: string
  number: string
  title: string
  subtitle: string
  description: string
  ascii: string
  specs: { label: string; value: string }[]
  commands: string[]
}

export const techSections: TechSection[] = [
  {
    id: "kernel-systems",
    number: "01",
    title: "Discovery",
    subtitle: "High-signal search",
    description:
      "Searches Google and Bing for high-signal brand abuse queries such as login, support, and official site variants to surface suspicious results.",
    ascii: `
    ┌─────────────────────────┐
    │  SERP DISCOVERY          │
    │  ┌───────┐ ┌───────┐   │
    │  │ BRAND │ │ QUERY │   │
    │  └───┬───┘ └───┬───┘   │
    │      │         │        │
    │  ┌───┴─────────┴───┐   │
    │  │   BRIGHT DATA    │   │
    │  └─────────────────┘   │
    │  ┌───────────────────┐  │
    │  │ SUSPICIOUS URLs    │  │
    │  └───────────────────┘  │
    └─────────────────────────┘`,
    specs: [
      { label: "Engine", value: "Bright Data SERP" },
      { label: "Scope", value: "Global Search Engine" },
      { label: "Speed", value: "< 200ms" },
      { label: "Target", value: "Typosquats / Lookalikes" },
    ],
    commands: [
      "$ scan --brand 'Acme' --query 'login'",
      "Found 12 suspicious URLs",
      "$ check --domain-anomalies",
      "Detected: 2 homoglyph variants",
    ],
  },
  {
    id: "network-topologies",
    number: "02",
    title: "Surfaces",
    subtitle: "Web Unlocker",
    description:
      "Uses Bright Data Web Unlocker to inspect pages and social profiles that resist normal retrieval, hide behind captchas, or use IP blocking.",
    ascii: `
       [URL]─────[BLOCK]
        │          /│\\
        │         / │ \\
     [PROXY] ── [IP POOL]
        │         \\ │ /
        │          \\│/
     [UNLOCKER]──[CAPTCHA]
        │           │
     [RAW HTML]──[SUCCESS]`,
    specs: [
      { label: "Tool", value: "Web Unlocker" },
      { label: "Bypass", value: "CAPTCHAs, WAFs" },
      { label: "Fingerprint", value: "Auto-Rotating" },
      { label: "Success Rate", value: "99.9%" },
    ],
    commands: [
      "$ unlock --url 'https://susp-login.com'",
      "Bypassing Cloudflare turnstile...",
      "CAPTCHA bypassed. HTML retrieved.",
      "$ extract --metadata",
      "Title: Acme Official Support (Fake)",
    ],
  },
  {
    id: "distributed-ledger",
    number: "03",
    title: "Evidence",
    subtitle: "Scraping Browser",
    description:
      "Captures full-page screenshots and DOM snapshots as timestamped evidence through the Bright Data Scraping Browser to preserve a verifiable chain of custody.",
    ascii: `
    Snapshot #1021     Snapshot #1022
    ┌──────────┐      ┌──────────┐
    │ Tmp: 12:01│─────>│ Tmp: 12:05│
    │ Dom: HTML │      │ Dom: HTML │
    │ Img: PNG  │      │ Img: PNG  │
    │ Url: Hash │      │ Url: Hash │
    └──────────┘      └──────────┘
         │                  │
    ┌────┴────┐        ┌────┴────┐
    │ Storage │        │ Storage │
    │ Supabase│        │ Supabase│
    └─────────┘        └─────────┘`,
    specs: [
      { label: "Tool", value: "Scraping Browser" },
      { label: "Storage", value: "Supabase (Postgres)" },
      { label: "Format", value: "PNG / HTML / JSON" },
      { label: "Integrity", value: "Timestamped Chain" },
    ],
    commands: [
      "$ capture --screenshot --full-page",
      "Rendering DOM...",
      "Evidence saved: e_7b29x.png",
      "$ store --bucket 'evidence'",
      "Upload complete. ID: 89f-21a",
    ],
  },
  {
    id: "compiler-design",
    number: "04",
    title: "Scoring",
    subtitle: "Claude Analysis",
    description:
      "Sends the normalized evidence package to Claude for threat classification, urgency scoring, and structured phishing detection.",
    ascii: `
    Evidence Data
        │
    ┌───▼───┐
    │ CLAUDE│ ──> Analysis
    └───┬───┘
    ┌───▼────┐
    │ SCORE  │ ──> Confidence
    └───┬────┘
    ┌───▼──────────┐
    │ CLASSIFY     │
    │ THREAT       │ ──> Phishing
    └───┬──────────┘
    ┌───▼──────────┐
    │ EXTRACT      │ ──> Contacts
    └──────────────┘`,
    specs: [
      { label: "Model", value: "Claude-3.5-Sonnet" },
      { label: "Detection", value: "Phishing / Fraud" },
      { label: "Scoring", value: "0-100 (Confidence)" },
      { label: "Latency", value: "~4.5s" },
    ],
    commands: [
      "$ analyze --evidence e_7b29x",
      "Extracting visual & textual cues...",
      "Score: 98/100 [CRITICAL]",
      "Type: Credential Harvesting",
      "Confidence: High",
    ],
  },
  {
    id: "hardware-abstraction",
    number: "05",
    title: "Pipeline",
    subtitle: "Next.js Core",
    description:
      "The central nervous system of GhostNet AI. Handles API routing, asynchronous job execution, and serving the React-based frontend triage dashboard.",
    ascii: `
    ┌─────────────────────────┐
    │     TRIAGE FRONTEND      │
    ├─────────────────────────┤
    │     NEXT.JS ROUTER       │
    ├─────────────────────────┤
    │     API ENDPOINTS        │
    │  ┌─────┐ ┌─────┐       │
    │  │ JOB │ │ AI  │ ...   │
    │  └──┬──┘ └──┬──┘       │
    ├─────┼───────┼───────────┤
    │     │ VERCEL   │         │
    │     └────┬────┘         │
    │      [EDGE]              │
    └─────────────────────────┘`,
    specs: [
      { label: "Framework", value: "Next.js App Router" },
      { label: "Runtime", value: "Edge + Node.js" },
      { label: "Styling", value: "Tailwind CSS" },
      { label: "Hosting", value: "Vercel Serverless" },
    ],
    commands: [
      "$ next build",
      "Route (app)                              Size     First Load JS",
      "┌ ○ /                                    144 kB         388 kB",
      "└ ○ /dashboard                           201 kB         445 kB",
      "Build completed successfully",
    ],
  },
]

export const navLinks = techSections.map((s) => ({
  id: s.id,
  number: s.number,
  title: s.title,
}))
