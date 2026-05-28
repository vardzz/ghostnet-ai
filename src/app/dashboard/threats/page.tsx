"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Threat = {
  url: string;
  title: string;
  source: string;
  threatScore: number;
  urgency: "Critical" | "High" | "Medium" | "Low";
  threatType: string;
  whatIsHappening: string;
  whyItsDangerous: string;
  recommendedAction: string;
  registrarHint: string | null;
  abuseContactHint: string | null;
};

type SafeDomain = {
  url: string;
  reason: string;
};

type ThreatReport = {
  brandName: string;
  scanSummary: {
    totalScanned: number;
    threatsFound: number;
    safeDomains: number;
    scanDate: string;
    overallRiskLevel: string;
    overallRiskExplanation: string;
  };
  threats: Threat[];
  safeDomainsList: SafeDomain[];
  recommendedNextSteps: string[];
};

const urgencyColor = (urgency: string) => {
  switch (urgency) {
    case "Critical": return "text-red-500 border-red-500";
    case "High": return "text-orange-400 border-orange-400";
    case "Medium": return "text-yellow-400 border-yellow-400";
    case "Low": return "text-green-400 border-green-400";
    default: return "text-gray-400 border-gray-400";
  }
};

const urgencyBg = (urgency: string) => {
  switch (urgency) {
    case "Critical": return "bg-red-500/10";
    case "High": return "bg-orange-400/10";
    case "Medium": return "bg-yellow-400/10";
    case "Low": return "bg-green-400/10";
    default: return "bg-gray-400/10";
  }
};

export default function ThreatsPage() {
  const [report, setReport] = useState<ThreatReport | null>(null);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem("threatReport");
    if (!raw) {
      setNotFound(true);
      return;
    }

    try {
      setReport(JSON.parse(raw));
    } catch {
      setNotFound(true);
    }
  }, []);

  if (notFound) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">No scan report found.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="border border-white px-6 py-2 hover:bg-white hover:text-black transition-colors"
        >
          RUN A NEW SCAN
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-8">
        <span className="text-gray-400 text-sm">system_prompt ~ threat_report</span>
        <span className="text-gray-400 text-sm">{report.scanSummary.scanDate}</span>
      </div>

      <h1 className="text-4xl font-bold mb-2">Threat Report</h1>
      <p className="text-gray-400 mb-8">
        Brand monitored: <span className="text-white font-bold">{report.brandName}</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-gray-700 p-4">
          <p className="text-gray-400 text-xs mb-1">TOTAL SCANNED</p>
          <p className="text-3xl font-bold">{report.scanSummary.totalScanned}</p>
        </div>
        <div className="border border-red-500/50 p-4">
          <p className="text-gray-400 text-xs mb-1">THREATS FOUND</p>
          <p className="text-3xl font-bold text-red-400">{report.scanSummary.threatsFound}</p>
        </div>
        <div className="border border-green-500/50 p-4">
          <p className="text-gray-400 text-xs mb-1">SAFE DOMAINS</p>
          <p className="text-3xl font-bold text-green-400">{report.scanSummary.safeDomains}</p>
        </div>
        <div className={`border p-4 ${urgencyColor(report.scanSummary.overallRiskLevel)}`}>
          <p className="text-gray-400 text-xs mb-1">OVERALL RISK</p>
          <p className={`text-3xl font-bold ${urgencyColor(report.scanSummary.overallRiskLevel)}`}>
            {report.scanSummary.overallRiskLevel}
          </p>
        </div>
      </div>

      <div className="border border-gray-700 p-4 mb-8">
        <p className="text-gray-400 text-xs mb-2">SITUATION OVERVIEW</p>
        <p className="text-gray-200 leading-relaxed">{report.scanSummary.overallRiskExplanation}</p>
      </div>

      <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">
        ⚠ Detected Threats ({report.threats.length})
      </h2>

      {report.threats.length === 0 ? (
        <p className="text-green-400 mb-8">No threats detected. Brand appears clean.</p>
      ) : (
        <div className="flex flex-col gap-4 mb-8">
          {report.threats.map((threat, index) => (
            <div
              key={index}
              className={`border p-5 ${urgencyColor(threat.urgency)} ${urgencyBg(threat.urgency)}`}
            >
              <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div>
                  <span
                    className={`text-xs border px-2 py-0.5 mr-2 ${urgencyColor(threat.urgency)}`}
                  >
                    {threat.urgency}
                  </span>
                  <span className="text-xs border border-gray-600 text-gray-400 px-2 py-0.5">
                    {threat.threatType}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  via {threat.source} · Score: {threat.threatScore}/100
                </span>
              </div>

              <a
                href={threat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold mb-1 break-all hover:underline cursor-pointer inline-block"
              >
                {threat.url}
              </a>
              <p className="text-xs text-gray-400 mb-4">{threat.title}</p>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">WHAT IS HAPPENING</p>
                  <p className="text-sm text-gray-200">{threat.whatIsHappening}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">WHY IT IS DANGEROUS</p>
                  <p className="text-sm text-gray-200">{threat.whyItsDangerous}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                <span>
                  → ACTION: <span className="text-white">{threat.recommendedAction}</span>
                </span>
                {threat.registrarHint && (
                  <span>
                    → REGISTRAR: <span className="text-white">{threat.registrarHint}</span>
                  </span>
                )}
                {threat.abuseContactHint && (
                  <span>
                    → REPORT TO: <span className="text-white">{threat.abuseContactHint}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">
        ✓ Recommended Next Steps
      </h2>
      <div className="flex flex-col gap-2 mb-8">
        {report.recommendedNextSteps.map((step, index) => (
          <div key={index} className="flex gap-3 text-sm text-gray-200">
            <span className="text-gray-500">{index + 1}.</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      {report.safeDomainsList.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">
            ✓ Safe Domains ({report.safeDomainsList.length})
          </h2>
          <div className="flex flex-col gap-2 mb-8">
            {report.safeDomainsList.map((domain, index) => (
              <div key={index} className="border border-gray-700 p-3">
                <a
                  href={domain.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-400 break-all mb-1 hover:underline cursor-pointer inline-block"
                >
                  {domain.url}
                </a>
                <p className="text-xs text-gray-400">{domain.reason}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-4 border-t border-gray-700 pt-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="border border-gray-600 text-gray-400 px-6 py-2 hover:border-white hover:text-white transition-colors"
        >
          ← RUN NEW SCAN
        </button>
      </div>
    </div>
  );
}