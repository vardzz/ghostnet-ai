import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/threats", label: "Threats" },
  { href: "/dashboard/threats#evidence", label: "Evidence" }
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dashboard-glow text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 flex-col border-r border-white/8 bg-ink-950/75 px-6 py-8 backdrop-blur-xl lg:flex">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-aurora-400/30 bg-aurora-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.32em] text-aurora-300">
              GhostNet AI
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
              Live threat triage
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
              Monitor suspicious assets, review evidence, and hand clean inputs to backend wiring.
            </p>
          </div>

          <nav className="space-y-2 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/4 px-4 py-3 text-slate-200 transition hover:border-aurora-400/30 hover:bg-aurora-400/10 hover:text-white"
              >
                <span>{item.label}</span>
                <span className="text-xs text-slate-400">→</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/8 bg-white/5 p-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Fixture source</p>
            <p className="mt-2 leading-6">
              Uses docs/samples/live-threats.json so frontend and backend can wire against a shared mock payload.
            </p>
          </div>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}