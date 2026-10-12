import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { EventRequestDetails } from "@/components/inquiry/EventRequestDetails";
import { listStaffRequests } from "@/lib/request-service";
import { setStaffRequestStatus } from "@/lib/request-service";
import { salesNav } from "@/lib/portal-nav";
import { supabase } from "@/integrations/supabase/client";

type EventCustomerDetails = Record<string, unknown> & { name?: string; email?: string };

type EventRequest = Record<string, unknown> & {
  id: string;
  request_number: string;
  status: string;
  service_type: string;
  service_subtype?: string | null;
  customer_id: string;
  customer_details?: EventCustomerDetails | null;
  start_date?: string | null;
  people_count: number;
  departure?: string | null;
  destination?: string | null;
  request_mode?: string | null;
  end_date?: string | null;
  budget?: number | null;
  currency?: string;
  trip_type?: string | null;
  additional_requirements?: string | null;
  service_details?: Record<string, unknown> | null;
};

const EVENT_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SALES_CONTACTED",
  "OPTIONS_FOUND",
  "QUOTE_SENT",
  "CUSTOMER_APPROVAL",
  "PAYMENT_PENDING",
  "BOOKED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

function value(input: unknown, fallback = "—") {
  return input === null || input === undefined || input === "" ? fallback : String(input);
}

export const Route = createFileRoute("/sales/my-requests")({
  beforeLoad: () => {
    return typeof window === "undefined" ? undefined : requireRoleAccess(["SALES"]);
  },
  component: SalesEventsPage,
});

function SalesEventsPage() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [selected, setSelected] = useState<EventRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const rows = (await listStaffRequests()) as EventRequest[];
      setRequests(rows.filter((row) => row.service_type === "EVENT_AVIATION"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load event requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("sales-events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(request: EventRequest, status: string) {
    setSaving(request.id);
    setError("");
    setNotice("");
    try {
      await setStaffRequestStatus(request.id, status);
      setNotice("Event status and activity log updated.");
      setSelected((current) => (current?.id === request.id ? { ...current, status } : current));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update event status.");
    } finally {
      setSaving("");
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const customer = request.customer_details;
      const matchesStatus = statusFilter === "ALL" || request.status === statusFilter;
      const matchesSearch =
        !query ||
        [request.request_number, customer?.name, customer?.email, request.service_subtype].some(
          (part) =>
            String(part ?? "")
              .toLowerCase()
              .includes(query),
        );
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  return (
    <PortalShell title="Events" nav={salesNav}>
      {error && (
        <p role="alert" className="mb-4 border border-red-300/30 p-3 text-sm text-red-100">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 border border-green-300/20 p-3 text-sm text-green-100">
          {notice}
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reference, customer, or event"
          className="field min-w-56 flex-1"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="field min-w-48"
          aria-label="Filter event requests by status"
        >
          <option value="ALL">All statuses</option>
          {EVENT_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <span className="self-center whisper text-ivory/40">{filtered.length} event requests</span>
      </div>

      {loading ? (
        <p className="border border-ivory/10 p-8 text-center text-sm text-ivory/45">
          Loading events…
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => {
            const customer = request.customer_details;
            return (
              <article key={request.id} className="border border-ivory/10 bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="whisper text-champagne">{request.request_number} · EVENT</p>
                    <h2 className="mt-2 font-serif text-2xl text-ivory">
                      {value(request.service_subtype, "Aviation event").replaceAll("_", " ")}
                    </h2>
                    <p className="mt-1 text-sm text-ivory/55">
                      {value(customer?.name ?? request.customer_id)} · {value(customer?.email)}
                    </p>
                    <p className="mt-2 text-xs text-ivory/40">
                      {value(request.start_date, "Date to be confirmed")} ·{" "}
                      {value(request.people_count)} passengers
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(request)}
                      className="border border-ivory/30 px-3 py-2 whisper text-[0.6rem] text-ivory/70 hover:border-champagne hover:text-champagne"
                    >
                      VIEW DETAILS
                    </button>
                    <select
                      aria-label={`Status for ${request.request_number}`}
                      value={request.status}
                      disabled={saving === request.id}
                      onChange={(event) => void updateStatus(request, event.target.value)}
                      className="field min-w-48"
                    >
                      {EVENT_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>
            );
          })}
          {!filtered.length && (
            <p className="border border-dashed border-ivory/10 p-10 text-center text-sm text-ivory/40">
              No event requests match these filters.
            </p>
          )}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Event request ${selected.request_number}`}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-ivory/15 bg-[oklch(0.1_0.008_275)] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="whisper text-champagne">{selected.request_number} · EVENT AVIATION</p>
                <h2 className="mt-2 font-serif text-3xl text-ivory">
                  {value(selected.service_subtype, "Aviation event").replaceAll("_", " ")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="border border-ivory/20 px-3 py-2 text-ivory/70"
              >
                CLOSE
              </button>
            </div>
            <div className="my-5 grid gap-3 border-y border-ivory/10 py-5 text-sm text-ivory/65 sm:grid-cols-2">
              <span>Customer: {value(selected.customer_details?.name)}</span>
              <span>Email: {value(selected.customer_details?.email)}</span>
              <span>Event date: {value(selected.start_date)}</span>
              <span>Passengers: {value(selected.people_count)}</span>
              <span>Return date: {value(selected.end_date)}</span>
              <span>Trip type: {value(selected.trip_type)}</span>
              <span>
                Budget: {value(selected.currency)} {value(selected.budget)}
              </span>
              <span>Departure: {value(selected.departure)}</span>
              <span>Destination: {value(selected.destination)}</span>
              <span>Mode: {value(selected.request_mode, "ENQUIRY")}</span>
              <span>Request status: {selected.status.replaceAll("_", " ")}</span>
              <span>Booking: Not created by event request submission</span>
            </div>
            <EventRequestDetails serviceDetails={selected.service_details ?? {}} />
            {selected.additional_requirements && (
              <section className="mt-5">
                <p className="whisper text-champagne">ADDITIONAL REQUIREMENTS</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ivory/65">
                  {String(selected.additional_requirements)}
                </p>
              </section>
            )}
            <EventTimeline requestId={selected.id} />
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ivory/10 pt-5">
              <label className="whisper text-ivory/45" htmlFor="event-status">
                UPDATE STATUS
              </label>
              <select
                id="event-status"
                value={selected.status}
                disabled={saving === selected.id}
                onChange={(event) => void updateStatus(selected, event.target.value)}
                className="field min-w-48"
              >
                {EVENT_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <p className="w-full text-xs text-ivory/40">
                Status changes are saved to the request and recorded in its activity timeline. No
                booking or PNR is generated.
              </p>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

function EventTimeline({ requestId }: { requestId: string }) {
  const [events, setEvents] = useState<
    { id: string; event_type: string; message: string; created_at: string }[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase
      .from("request_timeline")
      .select("id, event_type, message, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(loadError.message);
        else setEvents(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  return (
    <section className="mt-6 border-t border-ivory/10 pt-5">
      <p className="whisper text-champagne">ACTIVITY TIMELINE</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {events.length ? (
        <ol className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="border-l border-champagne/30 pl-3">
              <p className="text-sm text-ivory/70">{event.message}</p>
              <p className="mt-1 text-xs text-ivory/35">
                {event.event_type.replaceAll("_", " ")} ·{" "}
                {new Date(event.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      ) : !error ? (
        <p className="mt-3 text-sm text-ivory/40">No activity recorded.</p>
      ) : null}
    </section>
  );
}
