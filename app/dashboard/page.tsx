"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [brand, setBrand] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) return;
    
    setIsSearching(true);
    
    // Simulate loading for 2 seconds
    setTimeout(() => {
      router.push("/dashboard/threats");
    }, 2000);
  };

  return (
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
    </div>
  );
}