import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef } from "react";
import { useInView } from "motion/react";
import { PublicPage, PublicPageHero } from "@/components/public/PublicPage";
import { BookingWidget } from "@/components/public/BookingWidget";
import { FleetSection } from "@/components/public/FleetSection";
import aviationImg from "@/assets/scenes/aviation.jpg";
import mobilityImg from "@/assets/scenes/mobility.jpg";
import homeImg from "@/assets/scenes/home.jpg";

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const helicopterFeatures = [
  "Airport transfers & city hops",
  "Scenic tours & aerial experiences",
  "Corporate & VIP transfers",
  "Wedding arrivals & special occasions",
  "Offshore & remote access",
  "Emergency medical support",
];

const jetFeatures = [
  "Light, mid-size & heavy jets",
  "International & intercontinental routes",
  "On-demand scheduling",
  "Dedicated flight coordination",
  "Group & family travel",
  "Corporate aviation solutions",
];

const networkStats = [
  { label: "Hubs", value: "London · Monaco · Dubai · New York" },
  { label: "Reach", value: "Four continents · 1,900 airfields" },
  { label: "Readiness", value: "Sixty minutes from the call" },
  { label: "Crew", value: "Dedicated captains assigned per journey" },
];

export function AviationPublicPage() {
  return (
    <PublicPage>
      <PublicPageHero
        eyebrow="Aviation Charter"
        headline="Private Aviation, Personally Arranged."
        sub="Helicopter and private jet charter experiences tailored around your schedule, your preferences, and your journey."
        image={aviationImg}
        cta={{ label: "REQUEST A FLIGHT", to: "/request-access" }}
      />

      <BookingWidget />

      {/* Helicopter section */}
      <section className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <Reveal>
              <div className="relative overflow-hidden">
                <img
                  src={homeImg}
                  alt="Helicopter charter"
                  className="h-[480px] w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 bg-[#14263D] px-5 py-3">
                  <span className="font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-[#B79A65] uppercase">
                    Helicopter Charter
                  </span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mb-3 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">01</p>
              <h2 className="font-serif text-3xl font-light leading-[1.1] text-[#14263D] md:text-4xl lg:text-5xl">
                Discover the Freedom of Helicopter Travel.
              </h2>
              <p className="mt-5 font-sans text-base leading-relaxed text-[#596579]">
                Flexible, personalized helicopter journeys for business, leisure and exceptional occasions. Skip the traffic, arrive in style, and experience destinations from a perspective few ever see.
              </p>
              <ul className="mt-6 space-y-2.5">
                {helicopterFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3 font-sans text-sm text-[#596579]">
                    <span className="h-px w-5 shrink-0 bg-[#B79A65]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/request-access"
                className="mt-8 inline-flex items-center gap-3 bg-[#14263D] px-7 py-3.5 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-white transition-all duration-300 hover:bg-[#B79A65]"
              >
                REQUEST HELICOPTER →
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Private Jet section */}
      <section className="bg-[#F6F4EF] py-24 md:py-32">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <Reveal className="order-2 md:order-1" delay={0.15}>
              <p className="mb-3 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">02</p>
              <h2 className="font-serif text-3xl font-light leading-[1.1] text-[#14263D] md:text-4xl lg:text-5xl">
                Private Aviation, Elevated.
              </h2>
              <p className="mt-5 font-sans text-base leading-relaxed text-[#596579]">
                Discover a more personalized way to travel with private jet charter experiences. From light jets to ultra-long-range aircraft, every flight is arranged around your schedule, not ours.
              </p>
              <ul className="mt-6 space-y-2.5">
                {jetFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3 font-sans text-sm text-[#596579]">
                    <span className="h-px w-5 shrink-0 bg-[#B79A65]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/request-access"
                className="mt-8 inline-flex items-center gap-3 bg-[#14263D] px-7 py-3.5 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-white transition-all duration-300 hover:bg-[#B79A65]"
              >
                REQUEST PRIVATE JET →
              </Link>
            </Reveal>
            <Reveal className="order-1 md:order-2">
              <div className="relative overflow-hidden">
                <img
                  src={mobilityImg}
                  alt="Private jet charter"
                  className="h-[480px] w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 right-0 bg-[#B79A65] px-5 py-3">
                  <span className="font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-white uppercase">
                    Private Jet Charter
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Network stats */}
      <section className="bg-[#14263D] py-20 md:py-24">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <Reveal className="mb-12">
            <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">Our Network</p>
            <h2 className="max-w-lg font-serif text-3xl font-light leading-[1.1] text-white md:text-4xl">
              Positioned, Not Promised.
            </h2>
          </Reveal>
          <div className="grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {networkStats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.08}>
                <p className="font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-[#B79A65] uppercase">{stat.label}</p>
                <p className="mt-3 font-serif text-lg font-light leading-snug text-white/80">{stat.value}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FleetSection />
    </PublicPage>
  );
}
