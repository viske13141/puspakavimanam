import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef } from "react";
import { useInView } from "motion/react";
import aviationImg from "@/assets/scenes/aviation.jpg";
import mobilityImg from "@/assets/scenes/mobility.jpg";
import experiencesImg from "@/assets/scenes/experiences.jpg";

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ServicesSection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        {/* Section header */}
        <RevealSection className="mb-16 md:mb-20">
          <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">
            Our Services
          </p>
          <h2 className="max-w-xl font-serif text-4xl font-light leading-[1.1] text-[#14263D] md:text-5xl">
            Aviation experiences crafted for you.
          </h2>
        </RevealSection>

        {/* Helicopter — image left, text right */}
        <div className="mb-20 grid items-center gap-10 md:mb-28 md:grid-cols-2 md:gap-16">
          <RevealSection>
            <div className="relative overflow-hidden">
              <img
                src={aviationImg}
                alt="Helicopter charter"
                className="h-[420px] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 bg-[#14263D] px-5 py-3">
                <span className="font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-[#B79A65] uppercase">
                  Helicopter Charter
                </span>
              </div>
            </div>
          </RevealSection>
          <RevealSection>
            <p className="mb-3 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">01</p>
            <h3 className="font-serif text-3xl font-light leading-[1.1] text-[#14263D] md:text-4xl">
              Discover the Freedom of Helicopter Travel.
            </h3>
            <p className="mt-5 font-sans text-base leading-relaxed text-[#596579]">
              Flexible, personalized helicopter journeys for business, leisure and exceptional occasions. Skip the traffic, arrive in style, and experience destinations from a perspective few ever see.
            </p>
            <ul className="mt-6 space-y-2">
              {["Airport transfers & city hops", "Scenic tours & experiences", "Corporate & VIP transfers", "Wedding arrivals"].map((item) => (
                <li key={item} className="flex items-center gap-3 font-sans text-sm text-[#596579]">
                  <span className="h-px w-5 bg-[#B79A65]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/aviation"
              className="mt-8 inline-flex items-center gap-3 border border-[#14263D] px-6 py-3 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-[#14263D] transition-all duration-300 hover:bg-[#14263D] hover:text-white"
            >
              EXPLORE HELICOPTERS →
            </Link>
          </RevealSection>
        </div>

        {/* Private Jet — text left, image right */}
        <div className="mb-20 grid items-center gap-10 md:mb-28 md:grid-cols-2 md:gap-16">
          <RevealSection className="order-2 md:order-1">
            <p className="mb-3 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">02</p>
            <h3 className="font-serif text-3xl font-light leading-[1.1] text-[#14263D] md:text-4xl">
              Private Aviation, Elevated.
            </h3>
            <p className="mt-5 font-sans text-base leading-relaxed text-[#596579]">
              Discover a more personalized way to travel with private jet charter experiences. From light jets to ultra-long-range aircraft, every flight is arranged around your schedule, not ours.
            </p>
            <ul className="mt-6 space-y-2">
              {["Light, mid & heavy jets", "International routes", "On-demand scheduling", "Dedicated flight coordination"].map((item) => (
                <li key={item} className="flex items-center gap-3 font-sans text-sm text-[#596579]">
                  <span className="h-px w-5 bg-[#B79A65]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/aviation"
              className="mt-8 inline-flex items-center gap-3 border border-[#14263D] px-6 py-3 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-[#14263D] transition-all duration-300 hover:bg-[#14263D] hover:text-white"
            >
              EXPLORE PRIVATE JETS →
            </Link>
          </RevealSection>
          <RevealSection className="order-1 md:order-2">
            <div className="relative overflow-hidden">
              <img
                src={mobilityImg}
                alt="Private jet charter"
                className="h-[420px] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute bottom-0 right-0 bg-[#B79A65] px-5 py-3">
                <span className="font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-white uppercase">
                  Private Jet Charter
                </span>
              </div>
            </div>
          </RevealSection>
        </div>

        {/* Full-width experiences */}
        <RevealSection>
          <div className="relative overflow-hidden">
            <img
              src={experiencesImg}
              alt="Aviation experiences"
              className="h-[480px] w-full object-cover md:h-[560px]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/80 via-[#0D1B2A]/40 to-transparent" />
            <div className="absolute inset-0 flex items-center px-10 md:px-16">
              <div className="max-w-lg">
                <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">03</p>
                <h3 className="font-serif text-3xl font-light leading-[1.1] text-white md:text-4xl">
                  Events & Experiences Beyond the Ordinary.
                </h3>
                <p className="mt-4 font-sans text-base leading-relaxed text-white/70">
                  From wedding arrivals to corporate aviation events, scenic tours to VIP transfers — we compose aviation experiences that become memories.
                </p>
                <Link
                  to="/experiences"
                  className="mt-8 inline-flex items-center gap-3 bg-white px-6 py-3 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-[#14263D] transition-all duration-300 hover:bg-[#B79A65] hover:text-white"
                >
                  EXPLORE EXPERIENCES →
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
