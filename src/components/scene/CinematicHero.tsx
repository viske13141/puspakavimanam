import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { ease, useCinematicMotion } from "./motion";
import { ScrollIndicator } from "./ScrollIndicator";

type Props = {
  image: string;
  eyebrow: string;
  headline: string;
  sub: string;
  caps?: boolean | undefined;
  /** Darker, stiller treatment (HELITEJET Private). */
  quiet?: boolean | undefined;
};

/**
 * The opening shot. A pinned frame: as the visitor scrolls, the camera pushes
 * slowly into the image while the title lifts away and dissolves.
 */
export function CinematicHero({ image, eyebrow, headline, sub, caps = false, quiet = false, inquiry }: Props & { inquiry?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { reduced } = useCinematicMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const still = reduced || quiet;
  const scale = useTransform(scrollYProgress, [0, 1], still ? [1.02, 1.06] : [1.08, 1.3]);
  const imgY = useTransform(scrollYProgress, [0, 1], reduced ? ["0%", "0%"] : ["0%", "12%"]);
  const dim = useTransform(scrollYProgress, [0, 0.8], [quiet ? 0.6 : 0.35, 0.92]);
  const titleY = useTransform(scrollYProgress, [0, 0.6], reduced ? [0, 0] : [0, -160]);
  const titleO = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.5], ["blur(0px)", reduced ? "blur(0px)" : "blur(10px)"]);
  const hintO = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section ref={ref} className="relative h-[170vh] md:h-[200vh]">
      <div className="sticky top-0 h-screen overflow-hidden grain">
        <motion.img
          src={image}
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          style={{ scale, y: imgY }}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />
        <motion.div style={{ opacity: dim }} className="absolute inset-0 bg-[#102030]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#102030_110%)]" />

        <motion.div style={{ y: titleY, opacity: titleO, filter: blur }} className="absolute inset-0 px-6">
          <div className="mx-auto flex h-full max-w-[1500px] flex-col items-center justify-center gap-8 md:flex-row md:justify-between">
            <div className="max-w-[700px] text-center md:text-left">
              <motion.p
                initial={reduced ? false : { opacity: 0, letterSpacing: "0.7em" }}
                animate={{ opacity: 1, letterSpacing: "0.42em" }}
                transition={{ duration: 1.8, ease, delay: 0.3 }}
                className="whisper text-[#D6BA7E]"
              >
                {eyebrow}
              </motion.p>
              <h1
                className={`mt-7 font-serif font-light text-ivory ${
                  caps ? "uppercase tracking-[0.08em] leading-[1.05] text-[9.5vw] md:text-[5.6vw]" : "leading-[0.98] tracking-[-0.01em] text-[13vw] md:text-[7.2vw]"
                }`}
              >
                {headline.split("\n").map((line, i) => (
                  <motion.span
                    key={i}
                    className="block text-white"
                    initial={reduced ? false : { opacity: 0, y: 40, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1.6, ease, delay: 0.6 + i * 0.18 }}
                  >
                    {line}
                  </motion.span>
                ))}
              </h1>
              <motion.p
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.6, delay: 1.4 }}
                className="mt-8 max-w-md font-serif text-xl italic font-light text-white/80 md:text-2xl"
              >
                {sub}
              </motion.p>
            </div>

            {inquiry && (
              <motion.div
                initial={reduced ? false : { opacity: 0, x: 28, y: 18 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 1.2, ease, delay: 0.8 }}
                className="mt-2 block w-full max-w-[500px] md:mt-0"
              >
                {inquiry}
              </motion.div>
            )}
          </div>
        </motion.div>

        <ScrollIndicator opacity={hintO} />
      </div>
    </section>
  );
}
