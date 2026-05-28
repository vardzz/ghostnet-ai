"use client"

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { motion } from "framer-motion"

const shadow = "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"

const COMMANDS: Record<string, string[]> = {
  help: [
    "Available commands:",
    "  help       - Show this message",
    "  sections   - List all technical modules",
    "  inspect    - Inspect the current module",
    "  about      - About GhostNet AI Hub",
    "  stack      - Show tech stack",
    "  clear      - Clear terminal",
    "  ascii      - Show ASCII art",
    "  v0         - ...",
  ],
  sections: [
    "01  Discovery",
    "02  Surfaces",
    "03  Evidence",
    "04  Scoring",
    "05  Takedowns",
    "06  Dashboard",
    "07  Storage",
    "08  Pipeline",
  ],
  inspect: [
    "Module: GhostNet AI Hub",
    "Version: 1.0.0",
    "Modules: 8 loaded",
    "Renderer: ASCII Character Engine",
    "Status: OPERATIONAL",
  ],
  about: [
    "GhostNet AI Terminal v1.0.0",
    "",
    "An evidence-first threat monitoring",
    "pipeline. We find lookalikes, capture",
    "verifiable evidence, and draft takedown",
    "reports automatically.",
    "",
    "Built with Next.js, Framer Motion, and love",
    "for the terminal aesthetic.",
  ],
  stack: [
    "Frontend:  Next.js 16 + React 19",
    "Styling:   Tailwind CSS",
    "AI Engine: Gemini-2.5-Flash",
    "Database:  Supabase / PostgreSQL",
    "Network:   Bright Data APIs",
  ],
  ascii: [
    "",
    "  ███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗",
    "  ████╗ ████║██╔═══██╗████╗  ██║██╔═══██╗",
    "  ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║",
    "  ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║",
    "  ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝",
    "  ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝",
    "",
  ],
  v0: [
    "",
    "  ██╗    ██╗      ██████╗ ██╗   ██╗███████╗    ██╗   ██╗ ██████╗ ",
    "  ██║    ██║     ██╔═══██╗██║   ██║██╔════╝    ██║   ██║██╔═══██╗",
    "  ██║    ██║     ██║   ██║██║   ██║█████╗      ██║   ██║██║   ██║",
    "  ██║    ██║     ██║   ██║╚██╗ ██╔╝██╔══╝      ╚██╗ ██╔╝██║   ██║",
    "  ██████╗███████╗╚██████╔╝ ╚████╔╝ ███████╗     ╚████╔╝ ╚██████╔╝",
    "  ╚═════╝╚══════╝ ╚═════╝   ╚═══╝  ╚══════╝      ╚═══╝   ╚═════╝ ",
    "",
    "  ██╗  ██╗    ██████╗     ██╗  ██╗██████╗ ",
    "  ██║  ██║   ██╔═████╗    ╚██╗██╔╝╚════██╗",
    "  ██║  ██║   ██║██╔██║     ╚███╔╝   ███╔═╝",
    "  ╚██╗██╔╝   ████╔╝██║     ██╔██╗  ██╔══╝ ",
    "   ╚███╔╝    ╚██████╔╝    ██╔╝ ██╗ ███████╗",
    "    ╚══╝      ╚═════╝     ╚═╝  ╚═╝ ╚══════╝",
    "",
    "  <3  <3  <3  <3  <3  <3  <3  <3  <3  <3",
    "",
  ],
}

interface TerminalLine {
  type: "input" | "output" | "v0"
  content: string
}

export function PseudoTerminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "output", content: 'Welcome to GhostNet AI Terminal v1.0.0' },
    { type: "output", content: 'Type "help" for available commands.' },
    { type: "output", content: "" },
  ])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const processCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    const baseLines: TerminalLine[] = [
      ...lines,
      { type: "input", content: `$ ${cmd}` },
    ]

    if (trimmed === "clear") {
      setLines([])
      setInput("")
      return
    }

    if (trimmed === "v0") {
      setLines([...baseLines, { type: "output", content: "" }])
      setInput("")
      const v0Lines = COMMANDS["v0"]
      v0Lines.forEach((line, i) => {
        setTimeout(() => {
          setLines((prev) => [...prev, { type: "v0", content: line }])
        }, i * 80)
      })
      return
    }

    const newLines: TerminalLine[] = [...baseLines]
    const response = COMMANDS[trimmed]
    if (response) {
      response.forEach((line) => {
        newLines.push({ type: "output", content: line })
      })
    } else if (trimmed === "") {
      // do nothing
    } else {
      newLines.push({ type: "output", content: `command not found: ${trimmed}` })
      newLines.push({ type: "output", content: 'Type "help" for available commands.' })
    }

    newLines.push({ type: "output", content: "" })
    setLines(newLines)
    setInput("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      processCommand(input)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col gap-4 bg-black p-8 border border-border mb-8"
        style={{ boxShadow: shadow }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-end gap-6">
            <span className="font-pixel-line text-7xl font-bold leading-none text-foreground md:text-9xl">
              {">_"}
            </span>
            <div className="pb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  INTERACTIVE
                </span>
              </div>
              <h2 className="mt-2 font-pixel-line text-3xl font-bold text-foreground md:text-5xl">
                Terminal
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
          Explore the system. Type commands to interact with the GhostNet AI Hub.
        </p>
      </motion.div>

      <div
        className="border border-border"
        style={{ boxShadow: shadow }}
        onClick={() => inputRef.current?.focus()}
        role="application"
        aria-label="Interactive pseudo-terminal"
      >
        {/* Terminal header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="h-2.5 w-2.5 bg-foreground" />
          <div className="h-2.5 w-2.5 bg-muted-foreground/50" />
          <div className="h-2.5 w-2.5 bg-muted-foreground/30" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            ghostnet-ai ~ interactive
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={scrollRef}
          className="h-80 overflow-y-auto bg-secondary/20 p-4"
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={`font-mono text-xs leading-relaxed ${
                line.type === "input"
                  ? "text-foreground"
                  : line.type === "v0"
                  ? "text-foreground brightness-125"
                  : "text-muted-foreground"
              }`}
            >
              {line.content || "\u00A0"}
            </div>
          ))}

          {/* Input line */}
          <div className="relative flex items-center font-mono text-xs text-foreground">
            <span className="mr-1">{"$"}</span>
            <span>{input}</span>
            <span className="animate-blink">{"█"}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 h-full w-full cursor-default border-none bg-transparent opacity-0 outline-none"
              aria-label="Terminal input"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </motion.section>
  )
}
