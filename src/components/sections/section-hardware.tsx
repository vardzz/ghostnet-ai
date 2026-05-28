"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import type { TechSection } from "@/lib/sections-data"

const shadow = "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"

/*
  SECTION 08: HARDWARE ABSTRACTION
  Style: Exploded view / layer cake. Each layer is a full-width band
  that you can hover to expand. Very different from the rest:
  big bold type, stacking layers that feel physical/tangible.
  Final section so it has a conclusive, monumental feel.
*/

const layers = [
  {
    level: "L4",
    name: "TRIAGE FRONTEND",
    desc: "React-based Next.js frontend rendering active threat feeds, interactive screenshot and DOM evidence, and DMCA cease-and-desist reports.",
    detail: "Tailwind CSS, Framer Motion, HTML Canvas, client-side PDF exports",
    color: "bg-foreground",
    textColor: "text-background",
  },
  {
    level: "L3",
    name: "NEXT.JS CORE API",
    desc: "Next.js App Router endpoints orchestrating discovering, scraping, and analyzing pipelines within a strict 120s budget.",
    detail: "API Routing, request schema validation, deadline scheduling, event dispatch",
    color: "bg-background",
    textColor: "text-foreground",
  },
  {
    level: "L2",
    name: "INTEGRATION LAYER",
    desc: "Bright Data proxy and scraping services unlocking pages and capturing visual screenshot assets from lookalikes.",
    detail: "Bright Data SERP API, Web Unlocker crawler, Scraping Browser automation",
    color: "bg-background",
    textColor: "text-foreground",
  },
  {
    level: "L1",
    name: "AI MODEL LAYER",
    desc: "Gemini 2.0 Flash reasoning agent classifying threat score, urgency tier, and drafting Cease & Desist reporting templates.",
    detail: "Structured JSON schema output, system prompt locking, validation parser",
    color: "bg-foreground/40",
    textColor: "text-foreground",
  },
  {
    level: "L0",
    name: "PERSISTENCE STORE",
    desc: "Supabase database layer and file storage buckets preserving immutable files and enforcing row-level tenant security.",
    detail: "PostgreSQL, Brands/Threats tables, Evidence S3 storage bucket",
    color: "bg-foreground/20",
    textColor: "text-foreground",
  },
]

function LayerStack() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div ref={ref} className="flex flex-col">
      {layers.map((layer, i) => (
        <motion.div
          key={layer.level}
          initial={{ opacity: 0, x: i * 10 - 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
          onClick={() => setExpanded(expanded === i ? null : i)}
          className={`cursor-pointer border border-border ${layer.color} transition-all duration-300 ${
            expanded === i ? "py-8" : "py-4"
          }`}
          style={{
            boxShadow: shadow,
            marginTop: i > 0 ? "-1px" : 0,
          }}
        >
          <div className="mx-auto flex max-w-7xl items-start gap-6 px-4 lg:px-8">
            <span className={`font-mono text-sm font-bold ${layer.textColor} opacity-50`}>
              {layer.level}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className={`font-pixel-line text-xl font-bold ${layer.textColor} md:text-2xl`}>
                  {layer.name}
                </h3>
                <motion.span
                  animate={{ rotate: expanded === i ? 180 : 0 }}
                  className={`font-mono text-sm ${layer.textColor} opacity-50`}
                >
                  v
                </motion.span>
              </div>
              <motion.div
                initial={false}
                animate={{ height: expanded === i ? "auto" : 0, opacity: expanded === i ? 1 : 0 }}
                className="overflow-hidden"
              >
                <p className={`mt-3 max-w-2xl font-mono text-xs leading-relaxed ${layer.textColor} opacity-70`}>
                  {layer.desc}
                </p>
                <div className={`mt-2 font-mono text-[10px] ${layer.textColor} opacity-50`}>
                  {layer.detail}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function RegisterView() {
  const registers = [
    { name: "SCAN_TIMEOUT", value: "120s (budget)" },
    { name: "CANDIDATE_LIMIT", value: "8 (discovered)" },
    { name: "BRIGHTDATA_ZONE", value: "SERP_zone_01" },
    { name: "GEMINI_MODEL", value: "gemini-2.0-flash" },
    { name: "SUPABASE_URL", value: "active" },
    { name: "TENANT_ID", value: "tenant_demo" },
    { name: "ACTIVE_SCANS", value: "1" },
    { name: "PIPELINE_STATUS", value: "OPERATIONAL" },
  ]

  return (
    <div className="border border-border" style={{ boxShadow: shadow }}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <div className="h-1.5 w-1.5 bg-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Pipeline Parameters
        </span>
      </div>
      <div className="grid grid-cols-2 gap-0">
        {registers.map((reg, i) => (
          <motion.div
            key={reg.name}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className={`flex items-center gap-3 px-4 py-2 font-mono text-xs ${
              i < registers.length - 2 ? "border-b border-border" : ""
            } ${i % 2 === 0 ? "border-r border-border" : ""}`}
          >
            <span className="w-24 shrink-0 font-bold text-foreground text-[10px]">{reg.name}</span>
            <span className="text-[10px] text-muted-foreground truncate">{reg.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function SectionHardware({ section }: { section: TechSection }) {
  return (
    <div className="py-20 lg:py-32">
      {/* Header: big number */}
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 flex items-center gap-8"
        >
          <span className="font-pixel-line text-8xl font-bold text-foreground/[0.06] md:text-[10rem]">
            {section.number}
          </span>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{section.subtitle}</span>
            <h2 className="font-pixel-line text-3xl font-bold text-foreground md:text-5xl">{section.title}</h2>
            <p className="mt-4 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">{section.description}</p>
          </div>
        </motion.div>
      </div>

      {/* Full-width layer stack */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15 }}
      >
        <LayerStack />
      </motion.div>

      {/* Bottom: register view + specs */}
      <div className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
          >
            <RegisterView />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            {section.specs.map((spec, i) => (
              <div
                key={spec.label}
                className="flex items-center justify-between border border-border p-4 font-mono"
                style={{ boxShadow: shadow }}
              >
                <span className="text-xs text-muted-foreground">{spec.label}</span>
                <span className="text-sm font-bold text-foreground">{spec.value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
