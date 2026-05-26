import { getLiveThreatsFixture } from "../../../lib/threats";
import { ThreatsTableClient } from "./threats-table-client";

export default function ThreatsPage() {
  const fixture = getLiveThreatsFixture();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/8 bg-white/6 p-6 shadow-panel backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-aurora-300">Threats</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Live threat feed validated against static JSON.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              The table is driven by the documented live-threat snapshot, with an evidence slide-over for screenshot and HTML references.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
            <div className="rounded-2xl border border-white/8 bg-ink-900/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active count</p>
              <p className="mt-2 text-2xl font-semibold text-white">{fixture.activeCount}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-ink-900/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Generated</p>
              <p className="mt-2 text-base font-semibold text-white">
                {new Date(fixture.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <ThreatsTableClient threats={fixture.threats} />
    </div>
  );
}