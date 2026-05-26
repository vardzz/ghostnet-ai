<div align="center">

```text
 ██████╗ ██╗  ██╗  ██████╗  ██████╗ ████████╗██████╗ ██╗███████╗ ████████╗      █████╗  ██████╗
██╔════╝ ██║  ██║ ██╔══██╗ ██╔════╝ ╚══██╔══╝██╔══██╗██║██╔════╝ ╚══██╔══╝     ██╔══██╗ ╚═██╔═╝
██║  ███╗███████║ ██║  ██║ ╚█████╗     ██║   ██║  ██║██║█████╗      ██║        ███████║   ██║
██║   ██║██╔══██║ ██║  ██║  ╚═══██╗    ██║   ██║  ██║██║██╔═══╝     ██║        ██╔══██║   ██║
╚██████╔╝██║  ██║ ██████╔╝ ██████╔╝    ██║   ██║  ╚████║███████╗    ██║        ██║  ██║ ██████╗
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝   ╚═════╝    ╚═╝   ╚═╝   ╚═══╝╚══════╝    ╚═╝        ╚═╝  ╚═╝ ╚═════╝
```

Autonomous phishing and impersonation detection for security, legal, and brand<br>
protection teams.

GhostNet AI turns live web intelligence into takedown-ready evidence in under
two minutes. Given a brand name, official domain, and social handles, the
system discovers suspicious domains, phishing pages, and spoofed profiles,
captures timestamped evidence, and drafts a polished report a team can act on
immediately.

</div>

## What GhostNet AI Does

GhostNet AI is built to catch brand impersonation before it becomes a customer
incident. It combines Bright Data's live web infrastructure with Claude-based
analysis to automate the full threat triage loop:

- Searches Google and Bing for high-signal brand abuse queries such as login,
  support, and official site variants.
- Unlocks suspicious pages and social surfaces to expose typosquats,
  homoglyph lookalikes, and cloned profiles.
- Captures full-page screenshots and page snapshots as evidence.
- Scores each threat by type, confidence, and urgency.
- Generates cease-and-desist ready reports with abuse contacts and supporting
  artifacts.

The result is a live threat dashboard that compresses what used to take days of
manual searching into a fast, repeatable workflow.

## Why It Matters

Modern impersonation campaigns move quickly and hide in plain sight. GhostNet AI
is designed for teams that need an evidence-first response, not a loose list of
URLs.

- Security teams get faster detection of phishing and fraud attempts.
- Brand protection teams get structured evidence instead of raw search noise.
- Legal teams get report drafts that are already aligned to takedown workflows.
- Compliance teams get a traceable chain of custody for screenshots, HTML, and
  timestamps.

## Detection Workflow

GhostNet AI follows a deliberate, premium-grade triage pipeline:

1. Input a brand identity: brand name, official domain, and known social
   handles.
2. Run targeted SERP searches to surface suspicious results and domain
   anomalies.
3. Use Web Unlocker to inspect pages and profile surfaces that resist normal
   retrieval.
4. Capture evidence through the Scraping Browser with timestamped screenshots.
5. Send the normalized evidence package to Claude for threat scoring and
   report drafting.
6. Persist the findings in the dashboard so the next action is obvious.

## Core Capabilities

- Real-time discovery across search engines and public web surfaces.
- Typosquat detection using character swaps, added words, and homoglyphs.
- Phishing and spoofed-profile analysis with structured scoring.
- Screenshot-backed evidence bundles for legal review.
- Auto-drafted takedown notices and abuse-contact hints.
- A dashboard built for live monitoring, not static reporting.

## Tech Stack

- Next.js 16 with React 19 and TypeScript.
- Bright Data SERP API, Web Unlocker, and Scraping Browser for web access.
- Claude for threat classification, urgency scoring, and report generation.
- Supabase for persistence, storage, and operational metadata.

## Project Structure

- `src/app` - application shell, global styling, and the landing/dashboard UI.
- `docs/architecture.md` - system design and data-flow overview.
- `docs/implementation.md` - pipeline logic, environment variables, and
  operational rules.
- `scripts/env-check.js` - build-time environment validation.

## Getting Started

Run the development server:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

The app is built with Next.js App Router conventions, so the main interface is
driven from `src/app/page.tsx` and styled globally through
`src/app/globals.css`.

## Available Scripts

- `npm run dev` - start the local development server.
- `npm run build` - validate environment variables and build for production.
- `npm run start` - launch the production server.
- `npm run lint` - run ESLint across the codebase.

## Environment Notes

GhostNet AI expects the following operational categories to be configured in a
real deployment:

- Bright Data credentials and zone identifiers.
- Supabase project URL, keys, and storage buckets.
- Anthropic API key and model selection.
- Application runtime settings such as scan deadlines and public labels.

Keep all provider secrets server-side. Never expose service-role credentials to
the browser.

## Product Positioning

GhostNet AI is not a generic crawler. It is a focused threat intelligence
system for brand impersonation, phishing detection, and takedown preparation.
Its value is in the combination of live web data, evidence capture, and
executive-ready reporting.

## Deployment

This project follows the standard Next.js deployment model and can be deployed
to any compatible hosting platform. For production, make sure environment
validation passes before build and that all third-party services are reachable.

## Documentation

If you want the deeper technical blueprint, start here:

- `docs/architecture.md`
- `docs/implementation.md`
- `docs/security.md`
- `docs/api.md`

## Closing Note

GhostNet AI is built to make impersonation response feel immediate, credible,
and operationally clean. It surfaces the right evidence, packages it properly,
and leaves the next decision ready for a security or legal team.
