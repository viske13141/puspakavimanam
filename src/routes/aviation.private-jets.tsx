import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { CinematicExperience, CinematicOverlayPanel } from "@/components/public/CinematicEngine";
import { FLIGHT_FRAMES, FLIGHT_POSTER } from "@/lib/frame-manifests";

export const Route = createFileRoute("/aviation/private-jets")({
  head: () => ({
    meta: [
      { title: "Private Jets — HELITEJET" },
      { name: "description", content: "Cinematic private jet charter experience. Scroll to explore." },
    ],
  }),
  component: PrivateJetsPage,
});

const BAND = {
  intro:    [0.00, 0.20],
  privacy:  [0.18, 0.38],
  cabin:    [0.35, 0.55],
  fleet:    [0.52, 0.72],
  benefits: [0.70, 0.88],
  cta:      [0.85, 1.00],
} as const;

function SideGradientLeft() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      background: "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.05) 100%)",
      zIndex: 0,
    }} />
  );
}
function SideGradientRight() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      background: "linear-gradient(to left, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.05) 100%)",
      zIndex: 0,
    }} />
  );
}
function CenterGradient() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.65) 100%)",
      zIndex: 0,
    }} />
  );
}

function IntroPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center" style={{ pointerEvents: "auto" }}>
      <CenterGradient />
      <div className="relative" style={{ zIndex: 1 }}>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mb-4 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase"
        >
          Private Aviation · HELITEJET
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-5xl font-light leading-[1.04] text-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
        >
          Your Journey<br />Begins Here.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.65 }}
          className="mt-5 max-w-lg font-sans text-base leading-relaxed text-white/75 md:text-lg"
        >
          Private aviation, reimagined. Scroll to experience the boarding sequence.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            to="/request-access"
            className="inline-flex min-h-12 items-center bg-[#B79A65] px-8 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-[#14263D]"
          >
            REQUEST PRIVATE JET →
          </Link>
        </motion.div>
        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="font-sans text-[0.6rem] tracking-[0.22em] text-white/40 uppercase">Scroll to explore</span>
          <div className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}

function PrivacyPanel() {
  return (
    <div className="relative flex h-full items-center px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientLeft />
      <div className="relative max-w-lg" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">The Experience</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Privacy. Comfort. Complete Control.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          Every private jet charter is arranged exclusively for you. No shared terminals, no fixed schedules — just your journey, on your terms.
        </p>
        <ul className="mt-5 space-y-2.5">
          {[
            "Exclusive use of the aircraft",
            "Flexible departure times",
            "Private FBO terminals",
            "Personalised onboard service",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 font-sans text-sm text-white/70">
              <span className="h-px w-5 shrink-0 bg-[#B79A65]" />{item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CabinPanel() {
  return (
    <div className="relative flex h-full items-center justify-end px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientRight />
      <div className="relative max-w-lg text-right" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Cabin & Comfort</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Designed Around Your Comfort.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          From light jets to ultra-long-range aircraft, every cabin is configured to deliver a premium travel experience. Catering, connectivity and comfort — all arranged in advance.
        </p>
        <ul className="mt-5 space-y-2.5">
          {[
            "Catering & beverage service",
            "In-flight connectivity",
            "Lie-flat seating options",
            "Dedicated cabin crew",
          ].map((item) => (
            <li key={item} className="flex items-center justify-end gap-3 font-sans text-sm text-white/70">
              {item}<span className="h-px w-5 shrink-0 bg-[#B79A65]" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FleetPanel() {
  return (
    <div className="relative flex h-full items-center px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientLeft />
      <div className="relative max-w-lg" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Aircraft Options</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          The Right Aircraft for Every Journey.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          HELITEJET works with a range of aircraft types to match your journey requirements. Options are discussed as part of each charter request.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { label: "Fleet Range", value: "Light to Ultra-Long-Range" },
            { label: "Scheduling", value: "On-Demand, 24/7" },
            { label: "Coordination", value: "Dedicated Flight Desk" },
            { label: "Routes", value: "Domestic & International" },
          ].map(({ label, value }) => (
            <div key={label} className="border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
              <p className="font-sans text-[0.6rem] font-semibold tracking-[0.15em] text-[#B79A65] uppercase">{label}</p>
              <p className="mt-1 font-serif text-base font-light text-white">{value}</p>
            </div>
          ))}
        </div>
        <Link
          to="/aviation"
          className="mt-6 inline-flex min-h-11 items-center border border-white/30 px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:border-white hover:bg-white/10"
        >
          VIEW FULL FLEET →
        </Link>
      </div>
    </div>
  );
}

function BenefitsPanel() {
  return (
    <div className="relative flex h-full items-center justify-end px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientRight />
      <div className="relative max-w-lg text-right" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Why Charter with HELITEJET</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Seamless from Enquiry to Touchdown.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          From first enquiry to wheels up, every step is handled with care and transparency. A dedicated coordinator works with you throughout.
        </p>
        <ul className="mt-5 space-y-2.5">
          {[
            "Personalised coordination",
            "Transparent proposals",
            "Flexible travel planning",
            "Dedicated support throughout",
          ].map((item) => (
            <li key={item} className="flex items-center justify-end gap-3 font-sans text-sm text-white/70">
              {item}<span className="h-px w-5 shrink-0 bg-[#B79A65]" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CTAPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center" style={{ pointerEvents: "auto" }}>
      <CenterGradient />
      <div className="relative max-w-2xl" style={{ zIndex: 1 }}>
        <p className="mb-4 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Charter a Private Jet</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl lg:text-6xl">
          Private Aviation, Arranged for You.
        </h2>
        <p className="mt-5 max-w-xl mx-auto font-sans text-base leading-relaxed text-white/70">
          Share your travel plans and the HELITEJET team will discuss the right aircraft and options for your journey.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/request-access"
            className="inline-flex min-h-12 items-center bg-[#B79A65] px-8 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-[#14263D]"
          >
            REQUEST PRIVATE JET →
          </Link>
          <Link
            to="/concierge"
            className="inline-flex min-h-12 items-center border border-white/40 px-8 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-white/10"
          >
            CONTACT THE TEAM
          </Link>
        </div>
      </div>
    </div>
  );
}

function PrivateJetsPage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A]">
      <PublicNav />
      <div className="pt-16 md:pt-20">
        <CinematicExperience
          frames={FLIGHT_FRAMES}
          poster={FLIGHT_POSTER}
          scrollHeight={5500}
          after={<PublicFooter />}
        >
          {(progress) => (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
                  zIndex: 3,
                }}
              />
              <CinematicOverlayPanel start={BAND.intro[0]} end={BAND.intro[1]} progress={progress}>
                <IntroPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.privacy[0]} end={BAND.privacy[1]} progress={progress}>
                <PrivacyPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.cabin[0]} end={BAND.cabin[1]} progress={progress}>
                <CabinPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.fleet[0]} end={BAND.fleet[1]} progress={progress}>
                <FleetPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.benefits[0]} end={BAND.benefits[1]} progress={progress}>
                <BenefitsPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.cta[0]} end={BAND.cta[1]} progress={progress}>
                <CTAPanel />
              </CinematicOverlayPanel>
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-[#B79A65]/60"
                style={{ width: `${progress * 100}%`, zIndex: 20, pointerEvents: "none" }}
              />
            </>
          )}
        </CinematicExperience>
      </div>
    </div>
  );
}
