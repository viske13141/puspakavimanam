import type { ReactNode } from "react";
import { motion } from "motion/react";
import { scenes, type World } from "@/content/site";
import { Chapter } from "./Chapter";
import { CinematicHero } from "./CinematicHero";
import { Closing } from "./Closing";
import { Passage } from "./Passage";
import { ease, useCinematicMotion } from "./motion";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";

/**
 * Reusable world composition: Hero → (chapters) → bespoke sections → Passage → Closing.
 * Every route uses this shell so pages open, breathe and end the same way.
 */
export function CinematicPage({ world, children, hideChapters = false, heroContent }: { world: World; children?: ReactNode; hideChapters?: boolean; heroContent?: ReactNode }) {
  const { reduced } = useCinematicMotion();
  return (
    <div className="public-site public-cinematic">
      <PublicNav />
      <motion.main
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease }}
        className="relative bg-white"
      >
        <CinematicHero image={scenes[world.key]} {...world.opening} inquiry={heroContent} />
        {!hideChapters && world.chapters?.map((c) => <Chapter key={c.id} chapter={c} />)}
        {children}
        <Passage text={world.passage} />
        <Closing next={world.next} />
      </motion.main>
      <PublicFooter />
    </div>
  );
}

export function worldHead(world: World) {
  return {
    meta: [
      { title: world.seo.title },
      { name: "description", content: world.seo.description },
      { property: "og:title", content: world.seo.title },
      { property: "og:description", content: world.seo.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#ffffff" },
    ],
  };
}
