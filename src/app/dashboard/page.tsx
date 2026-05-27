import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-white/6 p-6 shadow-panel backdrop-blur-xl sm:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-aurora-300">Dashboard shell</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              A compact shell for live monitoring and evidence review.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              This view keeps the left navigation fixed and reserves the content area for current threat snapshots,
              status chips, and evidence inspection.
            </p>
          </div>

          <Link
            href="/dashboard/threats"
            className="inline-flex items-center justify-center rounded-full border border-aurora-400/30 bg-aurora-400/15 px-5 py-3 text-sm font-semibold text-aurora-300 transition hover:bg-aurora-400/25 hover:text-white"
          >
            Open threats
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Navigation", "Dashboard, threats, and evidence anchors are wired into the shell."],
          ["Layout", "Responsive two-column structure with a fixed left nav on large screens."],
          ["Mock data", "Threat pages render from docs/samples/live-threats.json while backend routes are built."],
        ].map(([title, text]) => (
          <article key={title} className="rounded-3xl border border-white/8 bg-ink-900/60 p-5">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}