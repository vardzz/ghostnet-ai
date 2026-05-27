import { getMappedThreats } from "@/lib/threats";
import { ThreatsPageHeader } from "./_components/threats-page-header";
import { ThreatsTableClient } from "./_components/threats-table-client";

export default function ThreatsPage() {
  const { threats, activeCount, generatedAt } = getMappedThreats();

  return (
    <div className="space-y-6">
      <ThreatsPageHeader activeCount={activeCount} generatedAt={generatedAt} />
      <ThreatsTableClient threats={threats} />
    </div>
  );
}