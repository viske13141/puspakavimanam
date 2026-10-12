import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef } from "react";
import { useInView } from "motion/react";
import { PublicPage, PublicPageHero } from "@/components/public/PublicPage";
import aboutImg from "@/assets/scenes/about.jpg";
import aviationImg from "@/assets/scenes/aviation.jpg";
import destinationsImg from "@/assets/scenes/destinations.jpg";

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

const sections = [
  {
    num: "01",
    kicker: "Our Story",
    title: "A place to begin your charter enquiry.",
    body: "HELITEJET brings aviation charter requests into one place. Share the journey details you know, and use the customer portal to continue the request.",
    image: aboutImg,
    flip: false,
  },
  {
    num: "02",
    kicker: "Our Approach",
    title: "A request is the start of the process.",
    body: "The website collects trip requirements for review. Submitting a request does not confirm an aircraft, route or booking; options are discussed through the customer workflow.",
    image: aviationImg,
    flip: true,
  },
  {
    num: "03",
    kicker: "Our Reach",
    title: "Explore aircraft and route options.",
    body: "The project catalogue includes fixed-wing and rotary-wing aircraft models with seating information. It is not a live availability feed, so current options are confirmed as part of an enquiry.",
    image: destinationsImg,
    flip: false,
  },
];

const values = [
  { title: "Clarity", body: "Share dates, passenger count, route and any other requirements in your request." },
  { title: "Choice", body: "Describe your preferences so the team can understand what matters to your journey." },
  { title: "Coordination", body: "Keep request details and follow-up information together in the customer workflow." },
  { title: "Care", body: "Aviation requests can include additional notes about the journey and its requirements." },
];

export function AboutPublicPage() {
  return (
    <PublicPage>
      <PublicPageHero
        eyebrow="About HELITEJET"
        headline="A considered way to plan an aviation enquiry."
        sub="Explore charter options and share your journey requirements through the HELITEJET website."
        image={aboutImg}
      />

      {/* Story sections */}
      {sections.map((s) => (
        <section key={s.num} className={`py-24 md:py-32 ${s.flip ? "bg-[#F6F4EF]" : "bg-white"}`}>
          <div className="mx-auto max-w-[1440px] px-6 md:px-10">
            <div className={`grid items-center gap-12 md:grid-cols-2 md:gap-16`}>
              <Reveal className={s.flip ? "order-2 md:order-1" : ""} delay={0.1}>
                <p className="mb-3 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">{s.num}</p>
                <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-[#596579] uppercase">{s.kicker}</p>
                <h2 className="font-serif text-3xl font-light leading-[1.1] text-[#14263D] md:text-4xl">{s.title}</h2>
                <p className="mt-5 font-sans text-base leading-relaxed text-[#596579]">{s.body}</p>
              </Reveal>
              <Reveal className={s.flip ? "order-1 md:order-2" : ""}>
                <img
                  src={s.image}
                  alt={s.title}
                  className="h-[420px] w-full object-cover"
                  loading="lazy"
                />
              </Reveal>
            </div>
          </div>
        </section>
      ))}

      {/* Values */}
      <section className="bg-[#F7F8FA] py-24 md:py-32">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <Reveal className="mb-16">
            <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">Our Values</p>
            <h2 className="max-w-lg font-serif text-4xl font-light leading-[1.1] text-[#14263D] md:text-5xl">
              The Standard We Hold Ourselves To.
            </h2>
          </Reveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="border border-[#E5E9EF] bg-white p-8">
                  <h3 className="font-serif text-xl font-light text-[#14263D]">{v.title}</h3>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-[#596579]">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#14263D] py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
          <Reveal>
            <p className="mb-6 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">Begin a Conversation</p>
            <h2 className="font-serif text-4xl font-light leading-[1.1] text-white md:text-5xl">
              Every Exceptional Journey Begins with a Conversation.
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-white/60">
              Share your travel plans and let HELITEJET review the charter enquiry.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/request-access"
                className="inline-flex items-center bg-[#B79A65] px-8 py-4 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-white transition-all duration-300 hover:bg-white hover:text-[#14263D]"
              >
                START BOOKING
              </Link>
              <Link
                to="/concierge"
                className="inline-flex items-center border border-white/30 px-8 py-4 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-white transition-all duration-300 hover:border-white hover:bg-white/10"
              >
                CONTACT US
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicPage>
  );
}
