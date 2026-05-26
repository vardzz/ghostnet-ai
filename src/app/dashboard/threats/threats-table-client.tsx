"use client";

import { useMemo, useState } from "react";

type ThreatSummary = {
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
};

type Props = {
  threats: ThreatSummary[];
};

function urgencyStyles(level: string) {
  switch (level) {
    case "critical":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    case "high":
      return "border-ember-400/30 bg-ember-400/10 text-ember-400";
    case "medium":
      return "border-aurora-400/30 bg-aurora-400/10 text-aurora-300";
    default:
      return "border-white/10 bg-white/6 text-slate-300";
  }
}

export function ThreatsTableClient({ threats }: Props) {
  const [activeThreatId, setActiveThreatId] = useState(threats[0]?.id ?? null);
  const activeThreat = useMemo(
    () => threats.find((threat) => threat.id === activeThreatId) ?? threats[0] ?? null,
    [activeThreatId, threats]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]" id="evidence">
      <section className="overflow-hidden rounded-[2rem] border border-white/8 bg-ink-900/60 shadow-panel">
        <div className="border-b border-white/8 px-6 py-4 sm:px-8">
          <h3 className="text-lg font-semibold text-white">Threat table</h3>
          <p className="mt-1 text-sm text-slate-400">Select a row to inspect evidence links on the right.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/8 text-left text-sm">
            <thead className="bg-white/4 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium sm:px-8">Score</th>
                <th className="px-6 py-4 font-medium">Urgency</th>
                <th className="px-6 py-4 font-medium">Target URL</th>
                <th className="px-6 py-4 font-medium">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {threats.map((threat) => {
                const isActive = threat.id === activeThreatId;
                return (
                  <tr
                    key={threat.id}
                    onClick={() => setActiveThreatId(threat.id)}
                    className={`cursor-pointer transition ${isActive ? "bg-aurora-400/10" : "hover:bg-white/5"}`}
                  >
                    <td className="px-6 py-4 sm:px-8">
                      <div className="flex items-center gap-3 font-semibold text-white">
                        <span>{threat.threatScore}</span>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          {threat.rawTitle}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${urgencyStyles(threat.urgencyLevel)}`}>
                        {threat.urgencyLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-200">
                      <div className="max-w-[28rem] truncate">{threat.targetUrl}</div>
                      <div className="mt-1 text-xs text-slate-500">{threat.observedDomain}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                        {threat.analysisState}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <EvidenceSlideOver threat={activeThreat} />
    </div>
  );
}

function EvidenceSlideOver({ threat }: { threat: ThreatSummary | null }) {
  return (
    <aside className="rounded-[2rem] border border-white/8 bg-ink-900/70 p-6 shadow-panel backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-aurora-300">Evidence</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">Slide-over preview</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        This panel surfaces screenshot and HTML snapshot links for the selected threat.
      </p>

      {threat ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selected</p>
            <p className="mt-2 break-all text-sm text-white">{threat.targetUrl}</p>
            <p className="mt-2 text-xs text-slate-400">Last updated {new Date(threat.updatedAt).toLocaleString()}</p>
          </div>

          <div className="space-y-3">
            <EvidenceLink label="Screenshot URL" href={threat.screenshotUrl} />
            <EvidenceLink label="HTML Snapshot URL" href={threat.htmlSnapshotUrl} />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/4 p-5 text-sm text-slate-400">
          No threat selected.
        </div>
      )}
    </aside>
  );
}

function EvidenceLink({ label, href }: { label: string; href?: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-medium text-aurora-300 underline decoration-aurora-400/40 underline-offset-4 transition hover:text-white"
        >
          {href}
        </a>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Not available in this fixture.</p>
      )}
    </div>
  );
}