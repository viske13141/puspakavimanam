import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import aviationImg from "@/assets/scenes/aviation.jpg";

export function HomeHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-white pb-14 pt-28 md:pb-20 md:pt-36">
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-14 md:px-10">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <p className="mb-5 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">
            HELITEJET · Private Aviation
          </p>
          <h1 className="font-serif text-5xl font-light leading-[1.03] tracking-tight text-[#14263D] sm:text-6xl lg:text-7xl">
            Your journey.
            <br />
            Beyond ordinary.
          </h1>
          <p className="mt-6 max-w-lg font-sans text-base leading-relaxed text-[#596579] md:text-lg">
            Explore helicopter and private jet charter options, arranged around
            your plans.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/request-access"
              className="inline-flex min-h-12 items-center bg-[#14263D] px-6 py-3 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#B79A65] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B79A65]"
            >
              START A REQUEST
            </Link>
            <Link
              to="/aviation"
              className="inline-flex min-h-12 items-center border border-[#D7DDE5] px-6 py-3 font-sans text-xs font-semibold tracking-[0.12em] text-[#14263D] transition-colors hover:border-[#14263D] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B79A65]"
            >
              EXPLORE AVIATION
            </Link>
          </div>
        </motion.div>

        <motion.figure
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <img
            src={aviationImg}
            alt="Private aviation aircraft"
            width={1600}
            height={1100}
            fetchPriority="high"
            decoding="async"
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="absolute bottom-4 left-4 bg-white/95 px-4 py-2 font-sans text-[0.62rem] font-medium tracking-[0.12em] text-[#596579] uppercase">
            A more considered way to travel
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
