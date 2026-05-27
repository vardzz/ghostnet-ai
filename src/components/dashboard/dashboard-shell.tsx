import type { ReactNode } from "react"
import { DashboardNav } from "./dashboard-nav"

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
