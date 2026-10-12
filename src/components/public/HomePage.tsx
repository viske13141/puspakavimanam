import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { HomeHero } from "@/components/public/HomeHero";
import { BookingWidget } from "@/components/public/BookingWidget";
import { ServicesSection } from "@/components/public/ServicesSection";
import { FleetSection } from "@/components/public/FleetSection";
import {
  ExperiencesHomeSection,
  CustomerJourneySection,
  WhyHelitejetSection,
  HowItWorksSection,
  DestinationsSection,
  FinalCTASection,
} from "@/components/public/HomeSections";

export function HomePage() {
  return (
    <div className="public-site min-h-screen bg-white text-[#152238]">
      <PublicNav />
      <HomeHero />
      <BookingWidget />
      <ServicesSection />
      <FleetSection />
      <ExperiencesHomeSection />
      <CustomerJourneySection />
      <WhyHelitejetSection />
      <HowItWorksSection />
      <DestinationsSection />
      <FinalCTASection />
      <PublicFooter />
    </div>
  );
}
