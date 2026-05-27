type Props = {
  activeCount: number;
  generatedAt: string;
};

export function ThreatsPageHeader({ activeCount }: Props) {
  return (
    <section className="mb-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col items-start gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-foreground/10 text-foreground text-xs font-semibold uppercase tracking-widest">
            <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
            <span>Real-time Feed</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mt-2">
            Threats Overview
          </h2>
          <p className="text-muted-foreground mt-2 text-base max-w-2xl leading-relaxed">
            Monitor and manage detected brand impersonations, typosquats, and active threats in real-time. Review evidence and initiate automated takedowns.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Active Threats
            </p>
            <p className="mt-1 text-4xl font-bold font-mono text-destructive">
              {activeCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
