import { useEffect, useState } from "react";
import { searchBookingsByPnr } from "@/lib/booking-compliance-service";

type SearchResult = Awaited<ReturnType<typeof searchBookingsByPnr>>[number];

export function BookingPnrSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchBookingsByPnr(term)
        .then((matches) => {
          if (!active) return;
          setResults(matches);
          setError("");
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "Unable to search PNRs.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <section className="mb-6 border border-ivory/10 p-4">
      <label className="block max-w-md">
        <span className="whisper text-champagne">SEARCH BOOKING PNR</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field mt-2"
          placeholder="Enter all or part of a PNR"
          autoComplete="off"
        />
      </label>
      {loading && <p className="mt-3 text-xs text-ivory/45">Searching...</p>}
      {error && <p className="mt-3 text-xs text-red-200">{error}</p>}
      {query.trim() && !loading && !error && results.length === 0 && (
        <p className="mt-3 text-xs text-ivory/45">No matching bookings.</p>
      )}
      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-ivory/10">
          {results.map((booking) => (
            <li
              key={booking.request_id}
              className="grid gap-1 py-3 text-xs text-ivory/65 sm:grid-cols-4"
            >
              <span className="text-champagne">{booking.pnr}</span>
              <span>Request: {booking.request_id}</span>
              <span>
                {booking.departure ?? "TBC"} → {booking.destination ?? "TBC"}
              </span>
              <span>
                {booking.travel_date ?? "Date to be confirmed"} · {booking.booking_status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
