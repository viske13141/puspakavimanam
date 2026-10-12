import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef } from "react";
import { useInView } from "motion/react";
import destinationsImg from "@/assets/scenes/destinations.jpg";
import experiencesImg from "@/assets/scenes/experiences.jpg";

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Events and experiences ─────────────────────────────────────────── */
export function ExperiencesHomeSection() {
  return (
    <section className="bg-[#F6F4EF] py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
          <Reveal>
            <div className="relative overflow-hidden">
              <img
                src={experiencesImg}
                alt="Aviation experience"
                width={1200}
                height={900}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-4 left-4 bg-white/95 px-4 py-2 font-sans text-[0.62rem] font-semibold tracking-[0.14em] text-[#596579] uppercase">
                Events & Experiences
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">
              Events & Experiences
            </p>
            <h2 className="max-w-lg font-serif text-4xl font-light leading-[1.1] text-[#14263D] md:text-5xl">
              Make the occasion part of the journey.
            </h2>
            <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-[#596579]">
              Share your event plans, timing, location and aviation requirements
              through the existing customer Events workflow. A request is an
              enquiry—not a confirmed aircraft booking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/customer/events"
                className="inline-flex min-h-12 items-center bg-[#14263D] px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#B79A65]"
              >
                CREATE AN EVENT REQUEST
              </Link>
              <Link
                to="/experiences"
                className="inline-flex min-h-12 items-center border border-[#D7DDE5] px-6 font-sans text-xs font-semibold tracking-[0.1em] text-[#14263D] transition-colors hover:border-[#14263D]"
              >
                EXPLORE THE PROCESS
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Customer Journey ──────────────────────────────────────────────── */
const journeySteps = [
  { num: "01", title: "Easy Enquiry", body: "Submit your travel requirements through our simple booking widget or contact form." },
  { num: "02", title: "Personalised Requirements", body: "Our team reviews your request and reaches out to understand your specific needs." },
  { num: "03", title: "Sales Assistance", body: "A dedicated coordinator works with you to identify the best aircraft and options." },
  { num: "04", title: "Quotation Review", body: "Receive a clear, detailed proposal. Review at your convenience with no pressure." },
  { num: "05", title: "Booking Confirmation", body: "Confirm your booking and receive all flight details and documentation." },
  { num: "06", title: "Operational Coordination", body: "Our operations team handles all logistics so your journey proceeds seamlessly." },
];

export function CustomerJourneySection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <Reveal className="mb-16">
          <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">The HELITEJET Experience</p>
          <h2 className="max-w-lg font-serif text-4xl font-light leading-[1.1] text-[#14263D] md:text-5xl">
            Your Journey, Our Coordination.
          </h2>
          <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-[#596579]">
            From first enquiry to wheels up, every step is handled with care and transparency.
          </p>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {journeySteps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.07}>
              <div className="flex gap-5">
                <span className="mt-1 font-sans text-[0.65rem] font-semibold tracking-[0.2em] text-[#B79A65] shrink-0">{step.num}</span>
                <div>
                  <h3 className="font-serif text-xl font-light text-[#14263D]">{step.title}</h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-[#596579]">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Why HELITEJET ─────────────────────────────────────────────────── */
const whyItems = [
  { num: "01", title: "Personalized Coordination", body: "Every enquiry is handled by a dedicated aviation coordinator who understands your preferences and requirements." },
  { num: "02", title: "Seamless Enquiry Experience", body: "From first contact to confirmed flight, our process is designed to be effortless and transparent." },
  { num: "03", title: "Tailored Charter Solutions", body: "We match the right aircraft to your journey — whether a short hop or a long-haul international flight." },
  { num: "04", title: "Dedicated Support", body: "Our team is available throughout your journey to ensure everything proceeds exactly as planned." },
  { num: "05", title: "Flexible Travel Planning", body: "Your schedule drives ours. We work around your timeline, not the other way around." },
  { num: "06", title: "Premium Travel Experience", body: "From the aircraft cabin to ground coordination, every detail reflects the standard you expect." },
];

export function WhyHelitejetSection() {
  return (
    <section className="bg-[#F6F4EF] py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <Reveal className="mb-16">
          <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">Why HELITEJET</p>
          <h2 className="max-w-lg font-serif text-4xl font-light leading-[1.1] text-[#14263D] md:text-5xl">
            More Than a Journey.
          </h2>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {whyItems.map((item, i) => (
            <Reveal key={item.num} delay={i * 0.07}>
              <div className="border border-[#E5E9EF] bg-white p-8 transition-shadow duration-300 hover:shadow-[0_4px_32px_-8px_rgba(20,38,61,0.12)]">
                <span className="font-sans text-[0.65rem] font-semibold tracking-[0.2em] text-[#B79A65]">{item.num}</span>
                <h3 className="mt-4 font-serif text-xl font-light text-[#14263D]">{item.title}</h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-[#596579]">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ──────────────────────────────────────────────────── */
const steps = [
  { num: "01", title: "Tell Us Your Plans", body: "Share your travel requirements — destination, dates, passenger count and any preferences." },
  { num: "02", title: "Receive a Tailored Proposal", body: "Our team reviews your request and prepares a personalized aircraft and pricing proposal." },
  { num: "03", title: "Review and Confirm", body: "Review the proposal at your convenience. Ask questions, adjust details, and confirm when ready." },
  { num: "04", title: "Enjoy Your Journey", body: "We handle all coordination. You simply arrive and experience the flight." },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <Reveal className="mb-16">
          <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">The Process</p>
          <h2 className="max-w-lg font-serif text-4xl font-light leading-[1.1] text-[#14263D] md:text-5xl">
            How It Works.
          </h2>
        </Reveal>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:block">
          <div className="relative">
            <div className="absolute top-8 left-0 right-0 h-px bg-[#E5E9EF]" />
            <div className="grid grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <Reveal key={step.num} delay={i * 0.1}>
                  <div className="relative pt-0">
                    <div className="relative mb-8 flex items-center">
                      <div className="flex h-16 w-16 items-center justify-center border border-[#14263D] bg-white">
                        <span className="font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#14263D]">{step.num}</span>
                      </div>
                    </div>
                    <h3 className="font-serif text-xl font-light text-[#14263D]">{step.title}</h3>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-[#596579]">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: vertical steps */}
        <div className="space-y-8 md:hidden">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.08}>
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#14263D]">
                    <span className="font-sans text-[0.6rem] font-semibold tracking-[0.1em] text-[#14263D]">{step.num}</span>
                  </div>
                  {i < steps.length - 1 && <div className="mt-2 flex-1 w-px bg-[#E5E9EF]" />}
                </div>
                <div className="pb-8">
                  <h3 className="font-serif text-xl font-light text-[#14263D]">{step.title}</h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-[#596579]">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Destinations ──────────────────────────────────────────────────── */
export function DestinationsSection() {
  return (
    <section className="bg-[#F7F8FA] py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
          <Reveal>
            <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">
              Destinations & Routes
            </p>
            <h2 className="max-w-xl font-serif text-4xl font-light leading-[1.1] text-[#14263D] md:text-5xl">
              Your destination starts with a conversation.
            </h2>
            <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-[#596579]">
              HELITEJET does not publish live routes or fixed prices here. Tell
              us where you would like to travel, and include your preferred
              dates and passenger count in a charter request.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/request-access"
                className="inline-flex min-h-12 items-center bg-[#14263D] px-6 font-sans text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#B79A65]"
              >
                REQUEST A CHARTER
              </Link>
              <Link
                to="/concierge"
                className="inline-flex min-h-12 items-center border border-[#D7DDE5] px-6 font-sans text-xs font-semibold tracking-[0.1em] text-[#14263D] transition-colors hover:border-[#14263D]"
              >
                CONTACT THE TEAM
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <img
              src={destinationsImg}
              alt="A destination seen from the air"
              width={1200}
              height={900}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ─────────────────────────────────────────────────────── */
export function FinalCTASection() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-16 md:px-10">
        <Reveal>
          <p className="mb-5 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">
            Begin Your Journey
          </p>
          <h2 className="font-serif text-4xl font-light leading-[1.08] text-[#14263D] md:text-5xl">
            Every exceptional journey begins with a conversation.
          </h2>
          <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-[#596579]">
            Share your plans and the HELITEJET team can discuss options for your
            aviation request.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/request-access"
              className="inline-flex min-h-12 items-center bg-[#14263D] px-6 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#B79A65]"
            >
              START A REQUEST
            </Link>
            <Link
              to="/concierge"
              className="inline-flex min-h-12 items-center border border-[#D7DDE5] px-6 font-sans text-xs font-semibold tracking-[0.12em] text-[#14263D] transition-colors hover:border-[#14263D]"
            >
              CONTACT HELITEJET
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <img
            src={destinationsImg}
            alt="Coastline viewed from the air"
            width={1400}
            height={1000}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
        </Reveal>
      </div>
    </section>
  );
}
