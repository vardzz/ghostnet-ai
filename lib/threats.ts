import liveThreatsFixture from "../docs/samples/live-threats.json";

export type LiveThreatFixture = typeof liveThreatsFixture;

export function getLiveThreatsFixture() {
  return liveThreatsFixture;
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