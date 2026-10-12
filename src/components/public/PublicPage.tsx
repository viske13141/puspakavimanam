import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { PublicNav } from "./PublicNav";
import { PublicFooter } from "./PublicFooter";

interface PublicPageHeroProps {
  eyebrow: string;
  headline: string;
  sub: string;
  image: string;
  cta?: { label: string; to: string };
}

export function PublicPageHero({ eyebrow, headline, sub, image, cta }: PublicPageHeroProps) {
  return (
    <section className="relative h-[70vh] min-h-[480px] overflow-hidden">
      <img
        src={image}
        alt={headline}
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#14263D]/25 via-[#14263D]/20 to-[#14263D]/60" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 flex flex-col items-start justify-end px-6 pb-16 pt-24 md:px-16 md:pb-24 lg:px-24"
      >
        <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.28em] text-[#B79A65] uppercase">
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl font-light leading-[1.05] text-white md:text-6xl lg:text-7xl">
          {headline}
        </h1>
        <p className="mt-4 max-w-xl font-serif text-lg font-light italic text-white/70">{sub}</p>
        {cta && (
          <Link
            to={cta.to}
            className="mt-8 inline-flex items-center bg-white px-7 py-3.5 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-[#14263D] transition-all duration-300 hover:bg-[#B79A65] hover:text-white"
          >
            {cta.label}
          </Link>
        )}
      </motion.div>
    </section>
  );
}

interface PublicPageProps {
  children: ReactNode;
}

export function PublicPage({ children }: PublicPageProps) {
  return (
    <div className="public-site min-h-screen bg-white text-[#152238]">
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  );
}
