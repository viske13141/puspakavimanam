import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { CinematicExperience, CinematicOverlayPanel } from "@/components/public/CinematicEngine";
import { YACHT_FRAMES, YACHT_POSTER } from "@/lib/frame-manifests";

export const Route = createFileRoute("/yachts")({
  head: () => ({
    meta: [
      { title: "Private Yachts — HELITEJET" },
      { name: "description", content: "Cinematic superyacht charter experience. Scroll to explore the ocean." },
    ],
  }),
  component: YachtsPage,
});

const BAND = {
  intro:    [0.00, 0.20],
  ocean:    [0.18, 0.38],
  sailing:  [0.35, 0.55],
  services: [0.52, 0.72],
  events:   [0.70, 0.88],
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
          Private Yachting · HELITEJET
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-5xl font-light leading-[1.04] text-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
        >
          Beyond the Horizon.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.65 }}
          className="mt-5 max-w-lg font-sans text-base leading-relaxed text-white/75 md:text-lg"
        >
          The ocean is yours. Scroll to experience the voyage.
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
            CHARTER A YACHT →
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

function OceanPanel() {
  return (
    <div className="relative flex h-full items-center px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientLeft />
      <div className="relative max-w-lg" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">The Ocean Journey</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          The Ocean Is Yours.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          From intimate sailing yachts to magnificent superyachts, HELITEJET arranges private yacht charters tailored to your vision of the perfect voyage.
        </p>
        <ul className="mt-5 space-y-2.5">
          {[
            "Superyacht & mega-yacht charters",
            "Mediterranean & Caribbean routes",
            "Crewed & bareboat options",
            "Bespoke itinerary planning",
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

function SailingPanel() {
  return (
    <div className="relative flex h-full items-center justify-end px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientRight />
      <div className="relative max-w-lg text-right" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Ocean Exploration</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Discover Private Yachting.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          Navigate the world's most beautiful coastlines and hidden anchorages. Every charter is a private exploration — your route, your pace, your story.
        </p>
        <ul className="mt-5 space-y-2.5">
          {[
            "Hidden anchorages & private bays",
            "Coastal & open-ocean routes",
            "Sunset cruises & day charters",
            "Multi-destination voyages",
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

function ServicesPanel() {
  return (
    <div className="relative flex h-full items-center px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientLeft />
      <div className="relative max-w-lg" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Onboard Experience</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Every Detail, Arranged.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          From onboard concierge to water sports equipment, every aspect of your yacht charter is coordinated to deliver an exceptional experience.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { label: "Vessel Types", value: "Sailing, Motor & Superyacht" },
            { label: "Destinations", value: "Mediterranean, Caribbean & Beyond" },
            { label: "Charter Options", value: "Crewed & Bareboat" },
            { label: "Coordination", value: "Dedicated Yacht Concierge" },
          ].map(({ label, value }) => (
            <div key={label} className="border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
              <p className="font-sans text-[0.6rem] font-semibold tracking-[0.15em] text-[#B79A65] uppercase">{label}</p>
              <p className="mt-1 font-serif text-base font-light text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsPanel() {
  return (
    <div className="relative flex h-full items-center justify-end px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <SideGradientRight />
      <div className="relative max-w-lg text-right" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Yacht Events</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Celebrate on the Water.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          From intimate gatherings to grand celebrations, a private yacht provides an extraordinary setting for events that deserve to be remembered.
        </p>
        <ul className="mt-5 space-y-2.5">
          {[
            "Private celebrations & anniversaries",
            "Corporate events & hospitality",
            "Wedding charters",
            "Onboard catering & entertainment",
          ].map((item) => (
            <li key={item} className="flex items-center justify-end gap-3 font-sans text-sm text-white/70">
              {item}<span className="h-px w-5 shrink-0 bg-[#B79A65]" />
            </li>
          ))}
        </ul>
        <Link
          to="/customer/events"
          className="mt-6 inline-flex min-h-11 items-center border border-white/30 px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:border-white hover:bg-white/10"
        >
          CREATE AN EVENT REQUEST →
        </Link>
      </div>
    </div>
  );
}

function CTAPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center" style={{ pointerEvents: "auto" }}>
      <CenterGradient />
      <div className="relative max-w-2xl" style={{ zIndex: 1 }}>
        <p className="mb-4 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Charter a Yacht</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl lg:text-6xl">
          Your Private Voyage Awaits.
        </h2>
        <p className="mt-5 max-w-xl mx-auto font-sans text-base leading-relaxed text-white/70">
          Share your plans and the HELITEJET team will discuss the right yacht and itinerary for your voyage.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/request-access"
            className="inline-flex min-h-12 items-center bg-[#B79A65] px-8 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-[#14263D]"
          >
            CHARTER A YACHT →
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

function YachtsPage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A]">
      <PublicNav />
      <div className="pt-16 md:pt-20">
        <CinematicExperience
          frames={YACHT_FRAMES}
          poster={YACHT_POSTER}
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
              <CinematicOverlayPanel start={BAND.ocean[0]} end={BAND.ocean[1]} progress={progress}>
                <OceanPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.sailing[0]} end={BAND.sailing[1]} progress={progress}>
                <SailingPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.services[0]} end={BAND.services[1]} progress={progress}>
                <ServicesPanel />
              </CinematicOverlayPanel>
              <CinematicOverlayPanel start={BAND.events[0]} end={BAND.events[1]} progress={progress}>
                <EventsPanel />
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
