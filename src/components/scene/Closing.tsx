import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { scenes, type World } from "@/content/site";
import { useCinematicMotion } from "./motion";

/**
 * The final frame: the next world's image irises open from the centre as
 * the visitor reaches the end, turning the page edge into a doorway.
 */
export function Closing({ next }: { next: World["next"] }) {
  const ref = useRef<HTMLElement>(null);
  const { reduced } = useCinematicMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });

  const clip = useTransform(
    scrollYProgress,
    [0.1, 0.8],
    reduced ? ["inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)"] : ["inset(48% 30% 48% 30%)", "inset(0% 0% 0% 0%)"],
  );
  const scale = useTransform(scrollYProgress, [0.1, 0.9], reduced ? [1, 1] : [1.25, 1.02]);
  const textO = useTransform(scrollYProgress, [0.55, 0.85], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.55, 0.85], reduced ? [0, 0] : [40, 0]);

  return (
    <section ref={ref} className="relative h-[150vh] bg-obsidian">
      <div className="sticky top-0 h-screen overflow-hidden grain">
        <motion.div style={{ clipPath: clip }} className="absolute inset-0">
          <motion.img
            src={scenes[next.image]}
            alt=""
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
            style={{ scale }}
            className="h-full w-full object-cover will-change-transform"
          />
          <div className="absolute inset-0 bg-obsidian/55" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--obsidian)_100%)]" />
        </motion.div>

        <motion.div style={{ opacity: textO, y: textY }} className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="whisper text-champagne/80">Continue</span>
          <Link to={next.to} className="group mt-6">
            <span className="block font-serif font-light leading-none text-ivory text-[13vw] md:text-[7vw] transition-colors duration-700 group-hover:text-champagne">
              {next.name}
            </span>
            <span className="mx-auto mt-6 block h-px w-24 origin-center scale-x-50 bg-gold transition-transform duration-700 group-hover:scale-x-100" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
