import liveThreatsFixture from "../../docs/samples/live-threats.json";

export type LiveThreatFixture = typeof liveThreatsFixture;

/** Raw fixture access — prefer getMappedThreats() in most cases. */
export function getLiveThreatsFixture() {
  return liveThreatsFixture;
}

export type ThreatSummary = {
  id: string;
  targetUrl: string;
  score: number;
  urgency: string;
  state: string;
  screenshotUrl?: string;
  htmlSnapshotUrl?: string;
  rawTitle: string;
  observedDomain: string;
  updatedAt: string;
};

/** Returns threats mapped to ThreatSummary plus top-level fixture metadata. */
export function getMappedThreats(): {
  threats: ThreatSummary[];
  activeCount: number;
  generatedAt: string;
} {
  const fixture = getLiveThreatsFixture();
  return {
    activeCount: fixture.activeCount,
    generatedAt: fixture.generatedAt,
    threats: fixture.threats.map((t) => ({
      id: t.id,
      targetUrl: t.targetUrl,
      score: t.threatScore,
      urgency: t.urgencyLevel,
      state: t.analysisState,
      screenshotUrl: t.screenshotUrl,
      htmlSnapshotUrl: t.htmlSnapshotUrl,
      rawTitle: t.rawTitle,
      observedDomain: t.observedDomain,
      updatedAt: t.updatedAt,
    })),
  };
}

export function getThreatLabel(urgencyLevel: string) {
  switch (urgencyLevel) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}