"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import type { TechSection } from "@/lib/sections-data"

const shadow = "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"

/*
  SECTION 04: COMPILER DESIGN
  Style: Code editor / IDE aesthetic. Split pane with source code on the left
  and a live "transformation" view on the right. Each pipeline stage is a
  horizontal "tab" you can click. Syntax-highlighted monospace everywhere.
*/

const stages = [
  {
    name: "EVIDENCE",
    label: "Scraped Evidence Bundle",
    code: `{
  "targetUrl": "https://ghostnct.ai/login",
  "finalUrl": "https://ghostnct.ai/login",
  "pageTitle": "GhostNet AI Secure Login",
  "screenshotPath": "screenshots/threat_01.png",
  "htmlSnapshotPath": "html/threat_01.html",
  "formSelectors": ["form", "input[email]", "input[password]"],
  "visibleText": [
    "Sign in to your GhostNet AI Dashboard",
    "Enter your master access keys below"
  ],
  "status": "captured"
}`,
  },
  {
    name: "PROMPT",
    label: "Gemini Structured Prompts",
    code: `You are a brand protection analyst for GhostNet AI.

Analyze these scraped results and determine if they are
suspicious, impersonating, or threatening to the brand.

Return ONLY a valid JSON object matching the exact schema:
{
  "brandName": "GhostNet AI",
  "threats": [{
    "url": "https://ghostnct.ai/login",
    "threatScore": 94,
    "urgency": "Critical",
    "threatType": "Phishing",
    "whatIsHappening": "Impersonating login page...",
    "whyItsDangerous": "Credential harvesting risk..."
  }]
}`,
  },
  {
    name: "RESPONSE",
    label: "Gemini Model Raw Output",
    code: `{
  "brandName": "GhostNet AI",
  "scanSummary": {
    "totalScanned": 1,
    "threatsFound": 1,
    "safeDomains": 0,
    "scanDate": "May 28, 2026",
    "overallRiskLevel": "Critical"
  },
  "threats": [
    {
      "url": "https://ghostnct.ai/login",
      "title": "GhostNet AI Secure Login",
      "source": "Google",
      "threatScore": 94,
      "urgency": "Critical",
      "threatType": "Phishing",
      "whatIsHappening": "Impersonating login page.",
      "whyItsDangerous": "Harvests customer access keys.",
      "recommendedAction": "Takedown Request",
      "registrarHint": "Namecheap Inc.",
      "abuseContactHint": "abuse@namecheap.com"
    }
  ]
}`,
  },
  {
    name: "VALIDATION",
    label: "JSON Schema Validator Engine",
    code: `const validator = {
  validate(output) {
    const data = JSON.parse(output);
    assert(data.brandName === "GhostNet AI");
    assert(data.scanSummary.totalScanned >= 0);
    assert(["Critical","High","Medium","Low"].includes(
      data.scanSummary.overallRiskLevel
    ));
    assert(data.threats.every(t => 
      t.threatScore >= 0 && t.threatScore <= 100
    ));
    return { status: "validated", data };
  }
}`,
  },
  {
    name: "REPORT",
    label: "Structured Legal Draft Output",
    code: `CEASE AND DESIST DEMAND FOR ABUSE REMOVAL
Date: May 28, 2026
To: Namecheap Inc. (abuse@namecheap.com)

Subject: Urgent Phishing Takedown - https://ghostnct.ai/login

This letter constitutes formal notice under the DMCA and local regulations
that the domain ghostnct.ai is engaged in credential harvesting targeting
our brand GhostNet AI.

Evidence Attached:
- Screenshot Checksum: 01JY0G4J5F2A4X1V
- Captured HTML: html/threat_01.html
Please disable this target immediately.`,
  },
]

export function SectionCompiler({ section }: { section: TechSection }) {
  const [activeStage, setActiveStage] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-32">
      {/* Header Box (aligned with Section 02) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col gap-4 bg-black p-8 border border-border mb-6"
        style={{ boxShadow: shadow }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-end gap-6">
            <span className="font-pixel-line text-7xl font-bold leading-none text-foreground md:text-9xl">
              {section.number}
            </span>
            <div className="pb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{section.subtitle}</span>
              </div>
              <h2 className="mt-2 font-pixel-line text-3xl font-bold text-foreground md:text-5xl">
                {section.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              className="h-2.5 w-2.5 bg-foreground"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <span className="font-mono text-xs text-muted-foreground">LIVE</span>
          </div>
        </div>
        <p className="max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
          {section.description}
        </p>
      </motion.div>

      {/* IDE-like panel */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="overflow-hidden border border-border"
        style={{ boxShadow: shadow }}
      >
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-border">
          {stages.map((stage, i) => (
            <button
              key={stage.name}
              onClick={() => setActiveStage(i)}
              className={`flex items-center gap-2 border-r border-border px-5 py-3 font-mono text-xs transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none ${
                activeStage === i
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <span className="text-[10px] opacity-60">{String(i + 1).padStart(2, "0")}</span>
              <span className="whitespace-nowrap">{stage.name}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="grid lg:grid-cols-3">
          {/* Code pane (2 cols) */}
          <div className="border-b border-border lg:col-span-2 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {stages[activeStage].label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Stage {activeStage + 1}/{stages.length}
              </span>
            </div>
            <motion.div
              key={activeStage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-foreground">
                {/* Line numbers */}
                <span className="select-none text-muted-foreground/40">
                  {stages[activeStage].code.split("\n").map((_, i) => (
                    <span key={i} className="mr-6 inline-block w-4 text-right">{i + 1}</span>
                  ))}
                </span>
                {"\n"}
                {stages[activeStage].code}
              </pre>
            </motion.div>
          </div>

          {/* Info pane */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <div className="h-1.5 w-1.5 bg-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline Info</span>
            </div>

            {/* Pipeline progress */}
            <div className="border-b border-border p-4">
              <div className="flex gap-1">
                {stages.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-1.5 flex-1 ${i <= activeStage ? "bg-foreground" : "bg-border"}`}
                    initial={false}
                    animate={{ opacity: i <= activeStage ? 1 : 0.3 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>Source</span>
                <span>Binary</span>
              </div>
            </div>

            {/* Specs */}
            <div className="flex-1 p-4">
              <div className="flex flex-col gap-3">
                {section.specs.map((spec, i) => (
                  <div key={spec.label} className="flex flex-col gap-0.5 font-mono text-xs">
                    <span className="text-[10px] text-muted-foreground">{spec.label}</span>
                    <span className="font-bold text-foreground">{spec.value}</span>
                    {i < section.specs.length - 1 && <div className="mt-2 h-px bg-border" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
