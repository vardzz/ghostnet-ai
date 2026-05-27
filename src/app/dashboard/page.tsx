"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [brand, setBrand] = useState("");
  const [isSearching, setIsSearching] = useState(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) return;

    setIsSearching(true);

    setTimeout(() => {
      router.push("/dashboard/threats");
    }, 2000);
  };

  return (
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
    </div>
  );
}