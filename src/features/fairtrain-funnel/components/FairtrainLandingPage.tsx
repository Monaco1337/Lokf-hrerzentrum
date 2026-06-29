import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

import { AudienceSection } from "./landing/AudienceSection";
import { BenefitsSection } from "./landing/BenefitsSection";
import { ChecklistSection } from "./landing/ChecklistSection";
import { ContactSection } from "./landing/ContactSection";
import { FaqSection } from "./landing/FaqSection";
import { FoerderungSection } from "./landing/FoerderungSection";
import { HeroSection } from "./landing/HeroSection";
import { HowItWorksSection } from "./landing/HowItWorksSection";
import { LocationSection } from "./landing/LocationSection";
import { SeoClusterSection } from "./landing/SeoClusterSection";

export function FairtrainLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <AudienceSection />
        <BenefitsSection />
        <HowItWorksSection />
        <ChecklistSection />
        <LocationSection />
        <FoerderungSection />
        <SeoClusterSection />
        <FaqSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
