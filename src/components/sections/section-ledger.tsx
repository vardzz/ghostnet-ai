"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import type { TechSection } from "@/lib/sections-data"

const shadow = "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"

/*
  SECTION 03: DISTRIBUTED LEDGER
  Style: Horizontal scrolling block-chain visualization.
  Each block is a clickable card. Center-stage hero.
  Newspaper-column text layout for description.
*/

const blocks = [
  { hash: "screenshot_01JY0G4J5.png", prev: "html_01JY0G4J5.html", nonce: "244 KB", tx: "12 nodes", height: 1020 },
  { hash: "screenshot_01JY0G4K3.png", prev: "html_01JY0G4K3.html", nonce: "188 KB", tx: "8 nodes", height: 1021 },
  { hash: "screenshot_01JY0G5L2.png", prev: "html_01JY0G5L2.html", nonce: "312 KB", tx: "15 nodes", height: 1022 },
  { hash: "screenshot_01JY0G5M8.png", prev: "html_01JY0G5M8.html", nonce: "105 KB", tx: "4 nodes", height: 1023 },
  { hash: "screenshot_01JY0G6N4.png", prev: "html_01JY0G6N4.html", nonce: "419 KB", tx: "22 nodes", height: 1024 },
]

function BlockCard({ block, index, isSelected, onSelect }: {
  block: typeof blocks[0]
  index: number
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.15 + index * 0.1 }}
      onClick={onSelect}
      className={`group relative flex w-48 flex-shrink-0 flex-col border p-4 text-left font-mono transition-all duration-300 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none ${
        isSelected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground"
      }`}
      style={{ boxShadow: shadow }}
    >
      <span className={`text-[10px] uppercase tracking-wider ${isSelected ? "text-background/50" : "text-muted-foreground"}`}>
        Snapshot #{block.height}
      </span>
      <span className={`mt-2 text-sm font-bold truncate max-w-full block ${isSelected ? "text-background" : "text-foreground"}`}>
        {block.hash}
      </span>
      <div className="mt-3 flex flex-col gap-1 text-[10px]">
        <div className="flex justify-between">
          <span className={isSelected ? "text-background/50" : "text-muted-foreground"}>File Size</span>
          <span>{block.nonce}</span>
        </div>
        <div className="flex justify-between">
          <span className={isSelected ? "text-background/50" : "text-muted-foreground"}>DOM Depth</span>
          <span>{block.tx}</span>
        </div>
      </div>
      {/* Chain connector */}
      {index < blocks.length - 1 && (
        <div className="absolute -right-6 top-1/2 hidden -translate-y-1/2 items-center md:flex" aria-hidden="true">
          <div className="h-px w-6 bg-border" />
          <div className="h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-border" />
        </div>
      )}
    </motion.button>
  )
}

export function SectionLedger({ section }: { section: TechSection }) {
  const [selectedBlock, setSelectedBlock] = useState(2)

  return (
    <div className="py-20 lg:py-32">
      {/* Header Box (aligned with Section 02) */}
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
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
      </div>

      {/* Horizontal scrolling chain */}
      <div className="mt-12 overflow-x-auto">
        <div className="mx-auto flex w-max items-center gap-6 px-8 pb-4">
          {blocks.map((block, i) => (
            <BlockCard
              key={block.hash}
              block={block}
              index={i}
              isSelected={selectedBlock === i}
              onSelect={() => setSelectedBlock(i)}
            />
          ))}
        </div>
      </div>

      {/* Selected block detail + specs */}
      <div className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Block detail panel */}
          <motion.div
            key={selectedBlock}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="border border-border p-6"
            style={{ boxShadow: shadow }}
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-foreground" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Evidence Inspector</span>
            </div>
            <div className="mt-4 flex flex-col gap-3 font-mono text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Snapshot ID</span>
                <span className="font-bold text-foreground">#snap_{blocks[selectedBlock].height}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Screenshot File</span>
                <span className="font-bold text-foreground truncate max-w-[12rem] text-right">{blocks[selectedBlock].hash}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">HTML Snapshot</span>
                <span className="text-foreground truncate max-w-[12rem] text-right">{blocks[selectedBlock].prev}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">File Size</span>
                <span className="text-foreground">{blocks[selectedBlock].nonce}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Captured DOM Elements</span>
                <span className="text-foreground">{blocks[selectedBlock].tx}</span>
              </div>
            </div>
          </motion.div>

          {/* Specs as vertical meter */}
          <div className="flex flex-col gap-3">
            {section.specs.map((spec, i) => (
              <motion.div
                key={spec.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4 border border-border p-4"
                style={{ boxShadow: shadow }}
              >
                <div className="flex h-10 w-10 items-center justify-center bg-foreground font-mono text-xs font-bold text-background">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{spec.label}</div>
                  <div className="font-mono text-sm font-bold text-foreground">{spec.value}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
