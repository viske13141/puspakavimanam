import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { aircraftInventory, type AircraftKind, type InventoryAircraft } from "@/components/inquiry/aircraftInventory";
import aviationImg from "@/assets/scenes/aviation.jpg";

type FleetFilter = "all" | AircraftKind;

const catalogue = Array.from(
  new Map(
    aircraftInventory.map((aircraft) => [
      `${aircraft.kind}:${aircraft.model}:${aircraft.capacity}`,
      aircraft,
    ]),
  ).values(),
);

function labelForKind(kind: InventoryAircraft["kind"]) {
  return kind === "helicopter" ? "Rotary-wing" : "Fixed-wing";
}

export function FleetSection() {
  const [filter, setFilter] = useState<FleetFilter>("all");
  const aircraft =
    filter === "all" ? catalogue.slice(0, 8) : catalogue.filter((item) => item.kind === filter).slice(0, 8);

  return (
    <section id="fleet" className="scroll-mt-24 bg-[#F7F8FA] py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid items-end gap-8 border-b border-[#E5E9EF] pb-10 md:grid-cols-[1fr_0.8fr] md:pb-12">
          <div>
            <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.2em] text-[#B79A65] uppercase">
              Aircraft Catalogue
            </p>
            <h2 className="max-w-xl font-serif text-4xl font-light leading-[1.08] text-[#14263D] md:text-5xl">
              Find the right aircraft type for your journey.
            </h2>
          </div>
          <p className="max-w-xl font-sans text-sm leading-relaxed text-[#596579] md:justify-self-end">
            Browse model and seating details from the project catalogue. This is
            not a live availability list; aircraft options are discussed as part
            of each request.
          </p>
        </div>

        <figure className="relative mt-8 overflow-hidden">
          <img
            src={aviationImg}
            alt="Aircraft on the ground"
            width={1600}
            height={700}
            loading="lazy"
            decoding="async"
            className="h-56 w-full object-cover md:h-80"
          />
          <figcaption className="absolute bottom-3 left-3 bg-white/95 px-3 py-2 font-sans text-[0.6rem] text-[#596579] sm:bottom-5 sm:left-5 sm:px-4">
            Illustrative aviation photography; not a live aircraft listing.
          </figcaption>
        </figure>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter aircraft catalogue">
          {(
            [
              ["all", "All aircraft"],
              ["helicopter", "Helicopters"],
              ["flight", "Fixed-wing"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`min-h-11 border px-4 font-sans text-xs font-semibold tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B79A65] ${
                filter === value
                  ? "border-[#14263D] bg-[#14263D] text-white"
                  : "border-[#D7DDE5] bg-white text-[#596579] hover:border-[#14263D] hover:text-[#14263D]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {aircraft.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {aircraft.map((item) => (
              <article
                key={`${item.kind}:${item.model}:${item.capacity}`}
                className="border border-[#E5E9EF] bg-white p-5 transition-shadow hover:shadow-[0_8px_30px_-18px_rgba(20,38,61,0.35)]"
              >
                <p className="font-sans text-[0.62rem] font-semibold tracking-[0.15em] text-[#B79A65] uppercase">
                  {labelForKind(item.kind)}
                </p>
                <h3 className="mt-3 font-serif text-xl font-light text-[#14263D]">{item.model}</h3>
                <div className="mt-5 border-t border-[#E5E9EF] pt-4">
                  <p className="font-sans text-[0.62rem] font-semibold tracking-[0.12em] text-[#596579] uppercase">
                    Seating capacity
                  </p>
                  <p className="mt-1 font-sans text-sm text-[#14263D]">{item.capacity}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 border border-[#E5E9EF] bg-white p-6 font-sans text-sm text-[#596579]">
            No catalogue entries are available in this category.
          </p>
        )}

        <div className="mt-10 flex flex-col gap-4 border-t border-[#E5E9EF] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl font-sans text-sm leading-relaxed text-[#596579]">
            Seating and equipment depend on the specific aircraft selected for a
            journey. The HELITEJET team can discuss suitable options when you
            submit a request.
          </p>
          <Link
            to="/request-access"
            className="inline-flex min-h-12 shrink-0 items-center justify-center bg-[#14263D] px-6 font-sans text-xs font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#B79A65] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B79A65]"
          >
            REQUEST CHARTER
          </Link>
        </div>
      </div>
    </section>
  );
}
