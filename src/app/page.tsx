import { Navigation } from "@/components/landing/navigation"
import { HeroSection } from "@/components/landing/hero-section"
import { DomainSection } from "@/components/landing/domain-section"
import { TechTicker } from "@/components/landing/tech-ticker"
import { PseudoTerminal } from "@/components/landing/pseudo-terminal"
import { Footer } from "@/components/landing/footer"
import { techSections } from "@/lib/sections-data"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-white selection:text-black">
      <Navigation />

      <main>
        <HeroSection />

        <TechTicker />

        {techSections.map((section, index) => (
          <DomainSection
            key={section.id}
            section={section}
            index={index}
          />
        ))}

        <PseudoTerminal />
      </main>

      <Footer />
    </div>
  )
}