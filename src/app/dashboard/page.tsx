"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const ASCII_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=-~^"

function useAsciiFrame(rows: number, cols: number, enabled: boolean) {
  const [frame, setFrame] = useState("")
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const generateFrame = useCallback(() => {
    let result = ""
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const distFromCenter = Math.abs(c - cols / 2) / (cols / 2)
        const vertDist = Math.abs(r - rows / 2) / (rows / 2)
        const dist = Math.sqrt(distFromCenter ** 2 + vertDist ** 2)
        if (Math.random() > dist * 0.7) {
          result += ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
        } else {
          result += " "
        }
      }
      if (r < rows - 1) result += "\n"
    }
    return result
  }, [rows, cols])

  useEffect(() => {
    if (!enabled) {
      setFrame(generateFrame())
      return
    }

    const animate = (time: number) => {
      if (time - lastTimeRef.current > 120) {
        lastTimeRef.current = time
        setFrame(generateFrame())
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled, generateFrame])

  return frame
}

export default function DashboardPage() {
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SCANNING" | "ERROR">("IDLE");
  const [error, setError] = useState("");
  const router = useRouter();

  // For the scanline effect
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionEnabled(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setMotionEnabled(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleScan = async () => {
    if (!brand.trim()) return;

    setStatus("SCANNING");
    setError("");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: brand.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? "Scan failed");
      }

      sessionStorage.setItem("threatReport", JSON.stringify(data));
      router.push("/dashboard/threats");
    } catch (err) {
      let message = String(err);

      if (err instanceof Error && err.message) {
        message = err.message;
      }

      setStatus("ERROR");
      setError(message);
    }
  };

  const asciiFrame = useAsciiFrame(30, 80, motionEnabled);

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center px-4 overflow-hidden">
      {/* Scanline overlay */}
      {motionEnabled && (
        <div
          className="animate-scanline pointer-events-none absolute inset-0 z-10 h-[2px] w-full bg-foreground/5"
          aria-hidden="true"
        />
      )}

      {/* ASCII Background */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.10]"
        aria-hidden="true"
      >
        <pre className="font-mono text-sm leading-[18px] text-foreground lg:text-base lg:leading-[22px]">
          {asciiFrame}
        </pre>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 w-full max-w-2xl border border-border bg-background p-8 sm:p-12"
      >
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-muted-foreground" />
            <div className="h-2 w-2 bg-muted-foreground/50" />
            <div className="h-2 w-2 bg-muted-foreground/30" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              system_prompt ~ initiate_scan
            </span>
          </div>
          <div className="font-mono text-[10px] sm:text-xs text-muted-foreground bg-secondary/50 px-2 py-1">
            {status === "SCANNING"
              ? "STATUS: SCANNING"
              : status === "ERROR"
                ? "STATUS: ERROR"
                : "STATUS: IDLE"}
          </div>
        </div>

        <h2 className="mb-4 font-pixel-line text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
          Target Specification
        </h2>
        <p className="mb-10 font-mono text-sm leading-relaxed text-muted-foreground">
          Enter the brand name to configure the threat discovery pipeline. The system will
          scan live sources and generate an automated triage report.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleScan();
          }}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-3">
            <label htmlFor="brand-input" className="font-mono text-xs uppercase text-muted-foreground">
              {">"} target_brand_name
            </label>
            <input
              id="brand-input"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Acme Corp"
              disabled={status === "SCANNING"}
              className="w-full border border-border bg-secondary/20 px-4 py-4 font-mono text-lg text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground focus-visible:bg-secondary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:opacity-50"
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={status === "SCANNING" || !brand.trim()}
            className="group mt-4 inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-8 py-4 font-mono text-sm uppercase tracking-wide text-background transition-all duration-200 hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {status === "SCANNING" ? (
              <>
                <span className="animate-blink">{"█"}</span>
                SCANNING...
              </>
            ) : (
              <>
                EXECUTE SCAN
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  {"->"}
                </span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}