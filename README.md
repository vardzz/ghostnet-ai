<div align="center">

```text
   ██████╗ ██╗  ██╗  ██████╗  ██████╗ ████████╗██████╗ ██╗███████╗ ████████╗      █████╗  ██████╗
  ██╔════╝ ██║  ██║ ██╔══██╗ ██╔════╝ ╚══██╔══╝██╔══██╗██║██╔════╝ ╚══██╔══╝     ██╔══██╗ ╚═██╔═╝
██║  ███╗███████║ ██║  ██║ ╚█████╗     ██║   ██║  ██║██║█████╗      ██║        ███████║   ██║
██║   ██║██╔══██║ ██║  ██║  ╚═══██╗    ██║   ██║  ██║██║██╔═══╝     ██║        ██╔══██║   ██║
  ╚██████╔╝██║  ██║ ██████╔╝ ██████╔╝    ██║   ██║  ╚████║███████╗    ██║        ██║  ██║ ██████╗
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝   ╚═════╝    ╚═╝   ╚═╝   ╚═══╝╚══════╝    ╚═╝        ╚═╝  ╚═╝ ╚═════╝
```

</div>

GhostNet AI is a hackathon project for the Web Data UNLOCKED event under the Security and Compliance track. It is an evidence-first, sub-2-minute threat monitoring pipeline that uses Bright Data to discover suspicious lookalikes, captures evidence, and runs structured analysis to support human-reviewed takedown workflows.

## Hackathon Alignment

- Track: Security and Compliance
- Bright Data usage: SERP API for discovery, Web Unlocker for raw HTML retrieval, Scraping Browser for rendered evidence capture
- Goal: detect impersonation and phishing targets quickly, store verifiable evidence, and generate review-gated takedown drafts

## What This Project Does

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

The result is a live threat dashboard that compresses what used to take days of manual searching into a fast, repeatable workflow.

## Architecture Overview

User -> Next.js API routes -> Bright Data (SERP, Web Unlocker, Scraping Browser) -> Supabase (Postgres + Storage) -> Claude analysis -> Live dashboard.

Execution is time-boxed to 120 seconds and prioritizes evidence preservation with partial results when time is low.

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

## Demo and Submission (Hackathon)

- Repo: public GitHub link (add here)
- Demo URL: live deployment link (add here)
- Pitch Video: link (add here)
- Slides: link (add here)

## Closing Note

GhostNet AI is built to make impersonation response feel immediate, credible,
and operationally clean. It surfaces the right evidence, packages it properly, and leaves the next decision ready for a security or legal team.

## License

MIT
