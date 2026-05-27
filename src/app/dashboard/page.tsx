"use client";

<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
=======
import { useState } from "react";
import { useRouter } from "next/navigation";
>>>>>>> 0c4a1bbb59e01c622de524a0b9563c63310d4e00

export default function DashboardPage() {
  const [brand, setBrand] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
<<<<<<< HEAD

  // For the scanline effect
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionEnabled(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setMotionEnabled(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
=======
>>>>>>> 0c4a1bbb59e01c622de524a0b9563c63310d4e00

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) return;

    setIsSearching(true);

<<<<<<< HEAD
=======
    // Simulate loading for 2 seconds
>>>>>>> 0c4a1bbb59e01c622de524a0b9563c63310d4e00
    setTimeout(() => {
      router.push("/dashboard/threats");
    }, 2000);
  };

  return (
<<<<<<< HEAD
    <div className="relative flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center px-4 overflow-hidden">
      {/* Scanline overlay */}
      {motionEnabled && (
        <div
          className="animate-scanline pointer-events-none absolute inset-0 z-10 h-[2px] w-full bg-foreground/5"
          aria-hidden="true"
        />
      )}

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
            {isSearching ? "STATUS: SCANNING..." : "STATUS: IDLE"}
          </div>
        </div>

        <h2 className="mb-4 font-pixel-line text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
          Target Specification
        </h2>
        <p className="mb-10 font-mono text-sm leading-relaxed text-muted-foreground">
          Enter the brand name to configure the threat discovery pipeline. The system will
          scan live sources and generate an automated triage report.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col gap-6">
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
              disabled={isSearching}
              className="w-full border border-border bg-secondary/20 px-4 py-4 font-mono text-lg text-foreground placeholder:text-muted-foreground/50 transition-colors focus-visible:border-foreground focus-visible:bg-secondary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:opacity-50"
              autoFocus
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !brand.trim()}
            className="group mt-4 inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-8 py-4 font-mono text-sm uppercase tracking-wide text-background transition-all duration-200 hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <span className="animate-blink">{"█"}</span>
                Processing...
              </>
            ) : (
              <>
                Execute Scan
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  {"->"}
                </span>
              </>
            )}
          </button>
        </form>
      </motion.div>
=======
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-[2.5rem] border border-white/8 bg-white/5 p-8 shadow-panel backdrop-blur-xl sm:p-12 text-center relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-aurora-400/20 blur-3xl" />

          <div className="relative z-10">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-aurora-300">
              Threat Intelligence
            </p>
            <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Scan a Brand
            </h2>
            <p className="mb-10 text-sm leading-6 text-slate-300">
              Enter a brand name to generate a comprehensive threats overview report.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col items-center gap-5">
              <div className="relative w-full">
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  disabled={isSearching}
                  className="w-full rounded-2xl border border-white/10 bg-ink-900/60 px-6 py-5 text-center text-xl text-white placeholder-slate-500 shadow-inner outline-none transition duration-300 focus:border-aurora-400 focus:bg-ink-900 focus:ring-1 focus:ring-aurora-400 disabled:opacity-50"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSearching || !brand.trim()}
                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-aurora-400/15 px-8 py-5 text-base font-semibold text-aurora-300 transition duration-300 hover:bg-aurora-400/25 hover:text-white disabled:pointer-events-none disabled:opacity-50 border border-aurora-400/30"
              >
                {isSearching ? (
                  <span className="flex items-center gap-3">
                    <svg className="h-5 w-5 animate-spin text-aurora-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Initializing Report...
                  </span>
                ) : (
                  "Generate Report"
                )}
              </button>
            </form>
          </div>
        </div>
>>>>>>> 0c4a1bbb59e01c622de524a0b9563c63310d4e00
      </div>
      );
}