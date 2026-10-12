import { Link } from "@tanstack/react-router";
import { PublicPage, PublicPageHero } from "@/components/public/PublicPage";
import experiencesImg from "@/assets/scenes/experiences.jpg";

const requestDetails = [
  {
    number: "01",
    title: "Describe the occasion",
    text: "Tell us what you are planning and what you would like the aviation component to include.",
  },
  {
    number: "02",
    title: "Share the event details",
    text: "Add the date, city, venue and approximate attendee count in the event request.",
  },
  {
    number: "03",
    title: "Add travel requirements",
    text: "Include preferred aircraft type, passenger details and any coordination needs.",
  },
];

export function ExperiencesPublicPage() {
  return (
    <PublicPage>
      <PublicPageHero
        eyebrow="Events & Experiences"
        headline="Make the occasion part of the journey."
        sub="Share the occasion and aviation details with HELITEJET through the existing customer Events workflow."
        image={experiencesImg}
        cta={{ label: "START AN EVENT REQUEST", to: "/customer/events" }}
      />

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10">
          <div className="grid items-start gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div>
              <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">
                One Existing Workflow
              </p>
              <h2 className="font-serif text-4xl font-light leading-[1.08] text-[#14263D] md:text-5xl">
                Start with the details that matter.
              </h2>
              <p className="mt-5 font-sans text-base leading-relaxed text-[#596579]">
                The event request lets customers describe the purpose, timing,
                location, attendees and aviation preferences in one place.
                Submitting a request starts an enquiry; it does not confirm an
                aircraft or event booking.
              </p>
              <Link
                to="/customer/events"
                className="mt-8 inline-flex min-h-12 items-center bg-[#14263D] px-6 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#B79A65]"
              >
                OPEN CUSTOMER EVENTS
              </Link>
            </div>

            <div className="divide-y divide-[#E5E9EF] border-y border-[#E5E9EF]">
              {requestDetails.map((item) => (
                <article key={item.number} className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr] sm:gap-5">
                  <span className="font-sans text-xs font-semibold tracking-[0.16em] text-[#B79A65]">
                    {item.number}
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl font-light text-[#14263D]">{item.title}</h3>
                    <p className="mt-2 font-sans text-sm leading-relaxed text-[#596579]">
                      {item.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <figure className="mt-14">
            <img
              src={experiencesImg}
              alt="An aviation experience"
              width={1600}
              height={750}
              loading="lazy"
              className="h-64 w-full object-cover md:h-[420px]"
            />
            <figcaption className="mt-3 font-sans text-xs text-[#596579]">
              Illustrative HELITEJET experience photography.
            </figcaption>
          </figure>
        </div>
      </section>
    </PublicPage>
  );
}
