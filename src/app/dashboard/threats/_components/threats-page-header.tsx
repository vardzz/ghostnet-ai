type Props = {
  activeCount: number;
  generatedAt: string;
};

export function ThreatsPageHeader({ activeCount }: Props) {
  return (
    <section className="mb-8 border border-border bg-background p-6 md:p-8 relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="animate-scanline pointer-events-none absolute inset-0 z-10 h-[2px] w-full bg-foreground/5" />
      
      <div className="relative z-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-muted-foreground" />
            <div className="h-2 w-2 bg-muted-foreground/50" />
            <div className="h-2 w-2 bg-muted-foreground/30" />
            <span className="ml-2 font-mono text-xs uppercase text-muted-foreground tracking-widest">
              system_log ~ real_time_feed
            </span>
          </div>
          <h2 className="font-pixel-line text-4xl md:text-5xl font-bold tracking-tight text-foreground mt-2">
            Threats Overview
          </h2>
          <p className="font-mono text-muted-foreground mt-2 text-sm max-w-2xl leading-relaxed">
            Monitor and manage detected brand impersonations, typosquats, and active threats in real-time. Review evidence and initiate automated takedowns.
          </p>
        </div>

        <div className="flex items-center gap-6 border-l border-border pl-6">
          <div className="flex flex-col items-end">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              ACTIVE_THREATS
            </p>
            <p className="mt-2 text-5xl font-bold font-pixel-line text-destructive animate-pulse">
              {activeCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
