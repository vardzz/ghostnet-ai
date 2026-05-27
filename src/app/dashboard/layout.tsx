import type { ReactNode } from "react";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-white selection:text-black">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}