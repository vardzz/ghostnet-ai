"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import type { TechSection } from "@/lib/sections-data"

const shadow = "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"

/*
  SECTION 01: KERNEL & SYSTEMS
  Style: Full-width terminal takeover. The entire section looks like one big terminal window.
  The background is inverted (white on black), with a persistent "menu bar" at top.
*/

function BootSequence() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [lines, setLines] = useState<string[]>([])
  const bootLines = [
    "[  0.000000] Initializing GhostNet AI Threat Discovery Pipeline...",
    "[  0.001020] Loading brand monitors (tenant_demo)...",
    "[  0.002450] Connecting to Bright Data SERP API client...",
    "[  0.004900] Preparing brand variant search terms (homoglyphs)...",
    "[  0.008120] Scanning Google index for suspect domain lookalikes...",
    "[  0.015340] Scanning Bing index for spoofed login variants...",
    "[  0.024980] Parsing SERP results: 18 raw URLs matched",
    "[  0.038100] Applying typosquatting heuristics and ranking scores...",
    "[  0.052000] Selecting high-signal candidates for deep capture...",
    "[  OK  ] Discovery module operational. Ready for ingestion.",
  ]

  useEffect(() => {
    if (!isInView) return
    let i = 0
    const interval = setInterval(() => {
      if (i < bootLines.length) {
        const currentLine = bootLines[i]
        i++
        setLines((prev) => [...prev, currentLine])
      } else {
        clearInterval(interval)
      }
    }, 150)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView])

  return (
    <div ref={ref} className="bg-background p-6 font-mono text-xs leading-relaxed text-foreground">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={
            typeof line === "string" && line.startsWith("[  OK")
              ? "mt-2 font-bold text-foreground"
              : "text-muted-foreground"
          }
        >
          {line}
        </motion.div>
      ))}
      {lines.length < bootLines.length && (
        <span className="animate-blink inline-block text-foreground">{"_"}</span>
      )}
    </div>
  )
}

export function SectionKernel({ section }: { section: TechSection }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-32">
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

      {/* Giant terminal window */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden border border-border"
        style={{ boxShadow: shadow }}
      >
        {/* Terminal title bar */}
        <div className="flex items-center justify-between border-b border-border bg-foreground px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 border border-background/30 bg-background" />
              <div className="h-2.5 w-2.5 border border-background/30 bg-background/60" />
              <div className="h-2.5 w-2.5 border border-background/30 bg-background/30" />
            </div>
            <span className="font-mono text-xs text-background">
              discovery@ghostnet:~
            </span>
          </div>
          <span className="font-mono text-[10px] text-background/50">node v20.11.0</span>
        </div>

        {/* Terminal body with two columns */}
        <div className="grid lg:grid-cols-5">
          {/* Left: Boot sequence (3 cols) */}
          <div className="border-b border-border lg:col-span-3 lg:border-b-0 lg:border-r">
            <div className="border-b border-border px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Discovery Boot Sequence
              </span>
            </div>
            <BootSequence />
          </div>

          {/* Right: Specs parameters panel (2 cols) */}
          <div className="flex flex-col lg:col-span-2">
            <div className="border-b border-border px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                System Parameters
              </span>
            </div>

            {/* Specs as system parameters */}
            <div className="flex-1 p-6">
              <div className="flex flex-col gap-4">
                {section.specs.map((spec, i) => (
                  <motion.div
                    key={spec.label}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-start gap-2 font-mono text-xs border-b border-border/50 pb-2"
                  >
                    <span className="text-muted-foreground">{">"}</span>
                    <span className="text-muted-foreground uppercase">{spec.label}:</span>
                    <span className="font-bold text-foreground ml-auto">{spec.value}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom ASCII schematic */}
        <div className="border-t border-border">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <div className="h-1.5 w-1.5 bg-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Architecture Schematic
            </span>
          </div>
          <pre className="overflow-x-auto p-6 font-mono text-xs leading-relaxed text-muted-foreground">
            {section.ascii}
          </pre>
        </div>
      </motion.div>
    </div>
  )
}
