import Link from "next/link";
import { User } from "lucide-react";

export function DashboardNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground rounded">
          <span className="text-muted-foreground">{">"}</span>
          <span className="font-pixel tracking-wider text-foreground">GHOSTNET_AI</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-border">
            <User size={16} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
