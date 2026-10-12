import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { CinematicExperience, CinematicOverlayPanel } from "@/components/public/CinematicEngine";
import { FLIGHT_FRAMES, FLIGHT_POSTER } from "@/lib/frame-manifests";
import { BookingWidget } from "@/components/public/BookingWidget";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import aviationImg from "@/assets/scenes/aviation.jpg";
import mobilityImg from "@/assets/scenes/mobility.jpg";
import experiencesImg from "@/assets/scenes/experiences.jpg";
import destinationsImg from "@/assets/scenes/destinations.jpg";

// Scroll progress bands (0–1)
const BAND = {
  intro:       [0.00, 0.18],
  booking:     [0.16, 0.36],
  helicopter:  [0.33, 0.53],
  privatejet:  [0.50, 0.68],
  experiences: [0.65, 0.82],
  cta:         [0.80, 1.00],
} as const;

// Shared gradient overlay for text legibility
function Gradient({ from = "black/60", via = "black/20", to = "black/50" }: { from?: string; via?: string; to?: string }) {
  return (
    <div
      className={`absolute inset-0 bg-gradient-to-b from-${from} via-${via} to-${to} pointer-events-none`}
      style={{ zIndex: 0 }}
    />
  );
}

// Inline gradient (Tailwind JIT can't purge dynamic class names safely)
function DarkGradient() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.55) 100%)",
        zIndex: 0,
      }}
    />
  );
}

// ── Panel: Introduction ───────────────────────────────────────────────────────
function IntroPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center" style={{ pointerEvents: "auto" }}>
      <DarkGradient />
      <div className="relative" style={{ zIndex: 1 }}>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mb-4 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase"
        >
          HELITEJET · Private Aviation
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif text-5xl font-light leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
        >
          The World Is Yours<br />to Explore.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.65 }}
          className="mt-5 max-w-lg font-sans text-base leading-relaxed text-white/75 md:text-lg"
        >
          Helicopter and private jet charter experiences, arranged around your journey.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Link
            to="/request-access"
            className="inline-flex min-h-12 items-center bg-[#B79A65] px-7 py-3 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-[#14263D]"
          >
            START A REQUEST
          </Link>
          <Link
            to="/aviation"
            className="inline-flex min-h-12 items-center border border-white/50 px-7 py-3 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-white/10"
          >
            EXPLORE AVIATION
          </Link>
        </motion.div>
        {/* Scroll hint */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <span className="font-sans text-[0.6rem] tracking-[0.22em] text-white/40 uppercase">Scroll to explore</span>
          <div className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}

// ── Panel: Quick Booking ──────────────────────────────────────────────────────
function BookingPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-4 md:px-10" style={{ pointerEvents: "auto" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 100%)", zIndex: 0 }}
      />
      <div className="relative w-full max-w-5xl" style={{ zIndex: 1 }}>
        <p className="mb-3 text-center font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">
          Quick Booking
        </p>
        <h2 className="mb-6 text-center font-serif text-3xl font-light text-white md:text-4xl">
          Begin Your Journey.
        </h2>
        {/* BookingWidget rendered inline — all interactivity preserved */}
        <div className="shadow-[0_16px_80px_-12px_rgba(0,0,0,0.6)]">
          <BookingWidget inline />
        </div>
      </div>
    </div>
  );
}

// ── Panel: Helicopter Charter ─────────────────────────────────────────────────
function HelicopterPanel() {
  return (
    <div className="relative flex h-full items-center px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.1) 100%)", zIndex: 0 }}
      />
      <div className="relative max-w-xl" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">01 · Our Services</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Discover the Freedom of Helicopter Travel.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          Flexible, personalized helicopter journeys for business, leisure and exceptional occasions. Skip the traffic, arrive in style, and experience destinations from a perspective few ever see.
        </p>
        <ul className="mt-5 space-y-2">
          {["Airport transfers & city hops", "Scenic tours & experiences", "Corporate & VIP transfers", "Wedding arrivals"].map((item) => (
            <li key={item} className="flex items-center gap-3 font-sans text-sm text-white/70">
              <span className="h-px w-5 shrink-0 bg-[#B79A65]" />{item}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/aviation"
            className="inline-flex min-h-11 items-center border border-white/40 px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:border-white hover:bg-white/10"
          >
            EXPLORE HELICOPTERS →
          </Link>
          {/* Floating editorial image */}
        </div>
        <div className="mt-6 relative overflow-hidden w-48 md:w-64">
          <img src={aviationImg} alt="Helicopter charter" className="h-32 w-full object-cover md:h-40" />
          <div className="absolute bottom-0 left-0 bg-[#14263D] px-3 py-1.5">
            <span className="font-sans text-[0.58rem] font-semibold tracking-[0.15em] text-[#B79A65] uppercase">Helicopter Charter</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel: Private Jet ────────────────────────────────────────────────────────
function PrivateJetPanel() {
  return (
    <div className="relative flex h-full items-center justify-end px-6 md:px-16" style={{ pointerEvents: "auto" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to left, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.1) 100%)", zIndex: 0 }}
      />
      <div className="relative max-w-xl text-right" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">02 · Private Aviation</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl">
          Private Aviation, Elevated.
        </h2>
        <p className="mt-5 font-sans text-base leading-relaxed text-white/75">
          Discover a more personalized way to travel with private jet charter experiences. From light jets to ultra-long-range aircraft, every flight is arranged around your schedule, not ours.
        </p>
        <ul className="mt-5 space-y-2">
          {["Light, mid & heavy jets", "International routes", "On-demand scheduling", "Dedicated flight coordination"].map((item) => (
            <li key={item} className="flex items-center justify-end gap-3 font-sans text-sm text-white/70">
              {item}<span className="h-px w-5 shrink-0 bg-[#B79A65]" />
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link
            to="/aviation/private-jets"
            className="inline-flex min-h-11 items-center border border-white/40 px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:border-white hover:bg-white/10"
          >
            EXPLORE PRIVATE JETS →
          </Link>
        </div>
        <div className="mt-6 ml-auto relative overflow-hidden w-48 md:w-64">
          <img src={mobilityImg} alt="Private jet charter" className="h-32 w-full object-cover md:h-40" />
          <div className="absolute bottom-0 right-0 bg-[#B79A65] px-3 py-1.5">
            <span className="font-sans text-[0.58rem] font-semibold tracking-[0.15em] text-white uppercase">Private Jet Charter</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel: Experiences & Destinations ────────────────────────────────────────
function ExperiencesPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center" style={{ pointerEvents: "auto" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)", zIndex: 0 }}
      />
      <div className="relative max-w-2xl" style={{ zIndex: 1 }}>
        <p className="mb-3 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">03 · Events & Experiences</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl lg:text-6xl">
          Make the Occasion Part of the Journey.
        </h2>
        <p className="mt-5 max-w-xl mx-auto font-sans text-base leading-relaxed text-white/75">
          From wedding arrivals to corporate aviation events, scenic tours to VIP transfers — we compose aviation experiences that become memories.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/experiences"
            className="inline-flex min-h-11 items-center bg-white/10 border border-white/30 px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-white/20"
          >
            EXPLORE EXPERIENCES →
          </Link>
          <Link
            to="/destinations"
            className="inline-flex min-h-11 items-center border border-white/30 px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-white/10"
          >
            VIEW DESTINATIONS →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { img: experiencesImg, label: "Experiences" },
            { img: destinationsImg, label: "Destinations" },
            { img: aviationImg, label: "Aviation" },
            { img: mobilityImg, label: "Mobility" },
          ].map(({ img, label }) => (
            <div key={label} className="relative overflow-hidden">
              <img src={img} alt={label} className="h-20 w-full object-cover md:h-28" />
              <div className="absolute inset-0 bg-black/30" />
              <span className="absolute bottom-2 left-2 font-sans text-[0.58rem] font-semibold tracking-[0.12em] text-white/80 uppercase">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Panel: Final CTA ──────────────────────────────────────────────────────────
function FinalCTAPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center" style={{ pointerEvents: "auto" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.65) 100%)", zIndex: 0 }}
      />
      <div className="relative max-w-2xl" style={{ zIndex: 1 }}>
        <p className="mb-4 font-sans text-[0.65rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">Begin Your Journey</p>
        <h2 className="font-serif text-4xl font-light leading-[1.08] text-white md:text-5xl lg:text-6xl">
          Every Exceptional Journey Begins with a Conversation.
        </h2>
        <p className="mt-5 max-w-xl mx-auto font-sans text-base leading-relaxed text-white/70">
          Share your plans and the HELITEJET team can discuss options for your aviation request.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/request-access"
            className="inline-flex min-h-12 items-center bg-[#B79A65] px-8 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-[#14263D]"
          >
            START A REQUEST
          </Link>
          <Link
            to="/concierge"
            className="inline-flex min-h-12 items-center border border-white/40 px-8 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-white/10"
          >
            CONTACT HELITEJET
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-8">
          {[
            { label: "Helicopters", to: "/aviation" },
            { label: "Private Jets", to: "/aviation/private-jets" },
            { label: "Yachts", to: "/yachts" },
          ].map(({ label, to }) => (
            <Link
              key={label}
              to={to as "/aviation" | "/aviation/private-jets" | "/yachts"}
              className="font-sans text-xs font-semibold tracking-[0.1em] text-white/60 transition-colors hover:text-white uppercase"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main HomePage ─────────────────────────────────────────────────────────────
export function HomePage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
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
              {/* Always-on subtle vignette */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)",
                  zIndex: 3,
                }}
              />

              <CinematicOverlayPanel start={BAND.intro[0]} end={BAND.intro[1]} progress={progress}>
                <IntroPanel />
              </CinematicOverlayPanel>

              <CinematicOverlayPanel start={BAND.booking[0]} end={BAND.booking[1]} progress={progress}>
                <BookingPanel />
              </CinematicOverlayPanel>

              <CinematicOverlayPanel start={BAND.helicopter[0]} end={BAND.helicopter[1]} progress={progress}>
                <HelicopterPanel />
              </CinematicOverlayPanel>

              <CinematicOverlayPanel start={BAND.privatejet[0]} end={BAND.privatejet[1]} progress={progress}>
                <PrivateJetPanel />
              </CinematicOverlayPanel>

              <CinematicOverlayPanel start={BAND.experiences[0]} end={BAND.experiences[1]} progress={progress}>
                <ExperiencesPanel />
              </CinematicOverlayPanel>

              <CinematicOverlayPanel start={BAND.cta[0]} end={BAND.cta[1]} progress={progress}>
                <FinalCTAPanel />
              </CinematicOverlayPanel>

              {/* Progress indicator */}
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-[#B79A65]/60 transition-none"
                style={{ width: `${progress * 100}%`, zIndex: 20, pointerEvents: "none" }}
              />
            </>
          )}
        </CinematicExperience>
      </div>
    </div>
  );
}
