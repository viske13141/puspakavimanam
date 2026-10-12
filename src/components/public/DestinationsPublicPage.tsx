import { Link } from "@tanstack/react-router";
import { PublicPage, PublicPageHero } from "@/components/public/PublicPage";
import destinationsImg from "@/assets/scenes/destinations.jpg";

export function DestinationsPublicPage() {
  return (
    <PublicPage>
      <PublicPageHero
        eyebrow="Destinations & Routes"
        headline="Where would you like to go?"
        sub="Share your route and travel details with HELITEJET. Each request is reviewed individually."
        image={destinationsImg}
      />

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:px-10">
          <div>
            <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">
              Plan a Route
            </p>
            <h2 className="font-serif text-4xl font-light leading-[1.08] text-[#14263D] md:text-5xl">
              Your destination starts with your plans.
            </h2>
            <p className="mt-5 font-sans text-base leading-relaxed text-[#596579]">
              We do not display live routes, guaranteed service areas or fixed
              prices here. Include your departure point, destination, preferred
              dates and passenger count in a request so the team can discuss
              options with you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/request-access"
                className="inline-flex min-h-12 items-center bg-[#14263D] px-6 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#B79A65]"
              >
                REQUEST A CHARTER
              </Link>
              <Link
                to="/concierge"
                className="inline-flex min-h-12 items-center border border-[#D7DDE5] px-6 font-sans text-xs font-semibold tracking-[0.12em] text-[#14263D] transition-colors hover:border-[#14263D]"
              >
                CONTACT HELITEJET
              </Link>
            </div>
          </div>

          <figure className="relative">
            <img
              src={destinationsImg}
              alt="Coastline viewed from the air"
              width={1200}
              height={900}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
            <figcaption className="mt-3 font-sans text-xs text-[#596579]">
              Illustrative destination photography. Routes are arranged on request.
            </figcaption>
          </figure>
        </div>
      </section>
    </PublicPage>
  );
}
