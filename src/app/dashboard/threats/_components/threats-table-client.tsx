"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThreatSummary } from "@/lib/threats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LiveApiResponse = {
  threats: Array<{
    id: string;
    targetUrl: string;
    threatScore: number;
    urgencyLevel: string;
    analysisState: string;
    screenshotUrl?: string;
    htmlSnapshotUrl?: string;
    rawTitle: string;
    observedDomain: string;
    updatedAt: string;
  }>;
};

type PatchableFields = Pick<ThreatSummary, "score" | "state" | "screenshotUrl">;

type Props = {
  threats: ThreatSummary[];
};

// ---------------------------------------------------------------------------
// Helpers & Badges
// ---------------------------------------------------------------------------

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  low: "bg-foreground/10 text-foreground border-border",
};

function UrgencyBadge({ urgency }: { urgency: string }) {
  const classes = URGENCY_STYLES[urgency] ?? "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${classes}`}
    >
      {urgency === "critical" && (
        <span className="inline-block h-1.5 w-1.5 animate-pulse bg-destructive" />
      )}
      {urgency}
    </span>
  );
}

function GenerateReportButton({
  threatId,
  label = "Generate Report",
}: {
  threatId?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const handleClick = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/takedown/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threatId }),
      });
      if (!res.ok) throw new Error("Non-OK response");
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [threatId]);

  const label_ =
    status === "loading"
      ? "Processing..."
      : status === "ok"
        ? "Success ✓"
        : status === "error"
          ? "Failed — Retry"
          : label;

  return (
    <button
      id={`generate-report${threatId ? `-${threatId}` : ""}`}
      onClick={handleClick}
      disabled={status === "loading"}
      className={`group w-full inline-flex items-center justify-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground border border-foreground disabled:pointer-events-none disabled:opacity-50
        ${
          status === "ok"
            ? "bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/25"
            : status === "error"
              ? "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25"
              : "bg-foreground text-background hover:bg-transparent hover:text-foreground"
        }`}
    >
      {label_}
      {status === "idle" && (
         <span className="transition-transform duration-200 group-hover:translate-x-1 ml-1">{"->"}</span>
      )}
    </button>
  );
}

function fromApiShape(raw: LiveApiResponse["threats"][number]): ThreatSummary {
  return {
    id: raw.id,
    targetUrl: raw.targetUrl,
    score: raw.threatScore,
    urgency: raw.urgencyLevel,
    state: raw.analysisState,
    screenshotUrl: raw.screenshotUrl,
    htmlSnapshotUrl: raw.htmlSnapshotUrl,
    rawTitle: raw.rawTitle,
    observedDomain: raw.observedDomain,
    updatedAt: raw.updatedAt,
  };
}

function patchThreat(existing: ThreatSummary, incoming: ThreatSummary): ThreatSummary {
  const patchableKeys: (keyof PatchableFields)[] = ["score", "state", "screenshotUrl"];
  const changed = patchableKeys.some((k) => existing[k] !== incoming[k]);
  if (!changed) return existing;
  return { ...existing, ...Object.fromEntries(patchableKeys.map((k) => [k, incoming[k]])) };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ThreatsTableClient({ threats: seedThreats }: Props) {
  const [threats, setThreats] = useState<ThreatSummary[]>(seedThreats);
  const [activeThreatId, setActiveThreatId] = useState<string | null>(
    seedThreats[0]?.id ?? null
  );
  const [pollStatus, setPollStatus] = useState<"live" | "error">("live");

  const threatsRef = useRef(threats);
  useEffect(() => {
    threatsRef.current = threats;
  }, [threats]);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/threats/live");
        if (!res.ok) throw new Error("Non-OK");
        const data: LiveApiResponse = await res.json();

        setThreats((prev) => {
          const incoming = new Map(data.threats.map((t) => [t.id, fromApiShape(t)]));
          let changed = false;

          const next = prev.map((existing) => {
            const updated = incoming.get(existing.id);
            if (!updated) return existing;
            const patched = patchThreat(existing, updated);
            if (patched !== existing) changed = true;
            return patched;
          });

          for (const [id, t] of incoming) {
            if (!prev.some((p) => p.id === id)) {
              next.push(t);
              changed = true;
            }
          }

          return changed ? next : prev;
        });

        setPollStatus("live");
      } catch {
        setPollStatus("error");
      }
    }

    const intervalId = setInterval(poll, 5000);
    poll();
    return () => clearInterval(intervalId);
  }, []);

  const activeThreat = useMemo(
    () => threats.find((t) => t.id === activeThreatId) ?? threats[0] ?? null,
    [activeThreatId, threats]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:flex-1 border border-border bg-background relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="bg-secondary/20 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-normal">Threat Target</th>
                  <th className="px-6 py-4 font-normal">Classification</th>
                  <th className="px-6 py-4 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {threats.map((threat) => (
                  <ThreatRow
                    key={threat.id}
                    threat={threat}
                    isActive={threat.id === activeThreatId}
                    onSelect={setActiveThreatId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full lg:w-96 shrink-0 sticky top-24" id="evidence-panel">
          <EvidencePanel threat={activeThreat} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThreatRow
// ---------------------------------------------------------------------------

type ThreatRowProps = {
  threat: ThreatSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
};

function ThreatRow({ threat, isActive, onSelect }: ThreatRowProps) {
  const handleClick = () => {
    onSelect(threat.id);
    if (window.innerWidth < 1024) {
      document.getElementById("evidence-panel")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <tr
      onClick={handleClick}
      className={`cursor-pointer transition-colors group ${
        isActive ? "bg-secondary/40" : "hover:bg-secondary/20"
      }`}
    >
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="font-bold text-foreground font-sans">{threat.rawTitle}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5">SCORE: {threat.score}</span>
          </div>
          <div className="text-muted-foreground text-sm truncate max-w-sm font-mono">
            {threat.targetUrl}
          </div>
          <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-mono">{threat.observedDomain}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-2 items-start">
          <UrgencyBadge urgency={threat.urgency} />
        </div>
      </td>
      <td className="px-6 py-4 text-right align-middle">
         <button className={`inline-flex items-center justify-center border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground ${isActive ? 'border-foreground text-background bg-foreground' : 'border-border text-muted-foreground bg-transparent hover:border-foreground hover:text-foreground'}`}>
           {isActive ? "Viewing" : "Inspect ->"}
         </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Evidence Panel
// ---------------------------------------------------------------------------

function EvidencePanel({ threat }: { threat: ThreatSummary | null }) {
  if (!threat) {
    return (
      <div className="border border-dashed border-border p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[400px] font-mono text-sm">
        <p>[ awaiting target selection ]</p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-background flex flex-col relative">
      <div className="p-6 border-b border-border bg-secondary/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 bg-muted-foreground" />
          <div className="h-2 w-2 bg-muted-foreground/50" />
          <div className="h-2 w-2 bg-muted-foreground/30" />
          <span className="ml-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            evidence_viewer
          </span>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-pixel-line text-2xl font-bold">Threat Details</h3>
          <UrgencyBadge urgency={threat.urgency} />
        </div>
        <div className="space-y-1 font-mono">
          <p className="text-sm text-foreground break-all">{threat.targetUrl}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
            DETECTED: {new Date(threat.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
      
      <div className="p-6 space-y-6 flex-1 bg-background font-mono">
        <div className="space-y-4">
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Evidence Artifacts</h4>
          <EvidenceLink label="Screenshot" href={threat.screenshotUrl} />
          <EvidenceLink label="HTML Snapshot" href={threat.htmlSnapshotUrl} />
        </div>
      </div>

      <div className="p-6 border-t border-border bg-secondary/5">
        <GenerateReportButton threatId={threat.id} label="Initiate Takedown" />
      </div>
    </div>
  );
}

function EvidenceLink({ label, href }: { label: string; href?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-foreground">[{label}]</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors break-all p-2 border border-border/50 bg-secondary/20"
        >
          {href}
        </a>
      ) : (
        <span className="text-xs text-muted-foreground/50 italic p-2 border border-dashed border-border/50">data_unavailable</span>
      )}
    </div>
  );
}