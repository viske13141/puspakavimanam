import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { listStaffRequests, setStaffRequestStatus } from "@/lib/request-service";
import { salesNav as nav } from "@/lib/portal-nav";
import { supabase } from "@/integrations/supabase/client";
import { PassengerCompliancePanel } from "@/components/inquiry/PassengerCompliancePanel";
import { EventRequestDetails } from "@/components/inquiry/EventRequestDetails";

async function getIdentityDocUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("request-documents")
    .createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

type CustomerDetails = Record<string, unknown> & {
  name?: string;
  email?: string;
  mobile?: string;
  country?: string;
  identity_doc?: string;
};

type RequestRecord = Record<string, unknown> & {
  id: string;
  request_number: string;
  request_mode?: string | null;
  service_type: string;
  service_subtype?: string | null;
  status: string;
  customer_id: string;
  customer_details?: CustomerDetails | null;
  departure?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  people_count?: number;
  trip_type?: string | null;
  budget?: number | null;
  currency?: string;
  additional_requirements?: string | null;
  service_details?: Record<string, unknown> | null;
  request_documents?: unknown;
};

const STATUS_OPTIONS = [
  "DRAFT",
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
  "EXPIRED",
];

function statusColor(status: string) {
  if (status === "BOOKED" || status === "COMPLETED") return "border-green-300/40 text-green-200";
  if (status === "CANCELLED") return "border-red-300/40 text-red-200";
  if (status === "DRAFT") return "border-ivory/20 text-ivory/40";
  return "border-champagne/40 text-champagne";
}

function val(v: unknown, fallback = "—") {
  if (v === null || v === undefined || v === "") return fallback;
  return typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
}

export const Route = createFileRoute("/sales/requests")({
  beforeLoad: () => {
    return typeof window === "undefined" ? undefined : requireRoleAccess(["SALES"]);
  },
  component: SalesRequests,
});

function SalesRequests() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [viewing, setViewing] = useState<RequestRecord | null>(null);
  const [filter, setFilter] = useState("ALL");

  async function load() {
    try {
      setRequests((await listStaffRequests()) as RequestRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load requests.");
    }
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("sales-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(id: string, status: string) {
    setSaving(id);
    try {
      await setStaffRequestStatus(id, status);
      await load();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update request status.");
    }
    setSaving("");
  }

  const filtered =
    filter === "ALL"
      ? requests.filter((request) => request.service_type !== "EVENT_AVIATION")
      : requests.filter(
          (request) =>
            request.service_type !== "EVENT_AVIATION" && String(request.status) === filter,
        );

  return (
    <PortalShell title="Requests" nav={nav}>
      {error && <p className="mb-4 border border-red-300/30 p-3 text-sm text-red-100">{error}</p>}

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap gap-2">
        {["ALL", "SUBMITTED", "UNDER_REVIEW", "BOOKED", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`border px-3 py-1 whisper text-[0.58rem] transition-colors ${
              filter === s
                ? "border-champagne bg-champagne/10 text-champagne"
                : "border-ivory/15 text-ivory/45 hover:border-ivory/40 hover:text-ivory"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto whisper text-ivory/35 self-center">{filtered.length} records</span>
      </div>

      {/* Request list */}
      <div className="space-y-3">
        {filtered.map((request) => {
          const customer = request.customer_details;
          const isBooking = String(request.request_mode) === "BOOKING";
          return (
            <article
              key={String(request.id)}
              className="border border-ivory/10 bg-white/[0.02] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="whisper text-champagne">
                    {val(request.request_number)} · {val(request.request_mode, "ENQUIRY")}
                    {isBooking && (
                      <span className="ml-2 border border-champagne/30 px-2 py-0.5 text-[0.52rem]">
                        BOOKING
                      </span>
                    )}
                  </p>
                  <p className="mt-2 font-serif text-2xl text-ivory">{val(request.service_type)}</p>
                  <p className="mt-1 text-sm text-ivory/50">
                    {val(customer?.name ?? request.customer_id)} · {val(customer?.email)}
                  </p>
                  <p className="mt-1 text-xs text-ivory/35">
                    {val(request.departure, "No departure")} →{" "}
                    {val(request.destination, "No destination")} ·{" "}
                    {val(request.start_date, "No date")} · {val(request.people_count)} pax
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(request)}
                    className="border border-ivory/30 px-3 py-2 whisper text-[0.6rem] text-ivory/70 hover:border-champagne hover:text-champagne"
                  >
                    VIEW
                  </button>
                  <select
                    value={String(request.status)}
                    disabled={saving === String(request.id)}
                    onChange={(e) => void updateStatus(String(request.id), e.target.value)}
                    className="h-9 min-w-44 border border-champagne/50 bg-midnight px-3 font-sans text-xs tracking-[0.1em] text-ivory outline-none focus:border-champagne disabled:opacity-50"
                    aria-label={`Status for ${val(request.request_number)}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <span
                    className={`border px-2 py-1 whisper text-[0.55rem] ${statusColor(String(request.status))}`}
                  >
                    {String(request.status)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-ivory/35">
                Status changes are visible to the customer and admin.
              </p>
            </article>
          );
        })}
        {!filtered.length && (
          <p className="border border-dashed border-ivory/10 p-10 text-center text-sm text-ivory/35">
            No requests found.
          </p>
        )}
      </div>

      {/* Detail modal */}
      {viewing && (
        <RequestDetailModal
          request={viewing}
          onClose={() => setViewing(null)}
          onStatusChange={async (id, status) => {
            await updateStatus(id, status);
            setViewing((prev) => (prev ? { ...prev, status } : null));
          }}
          saving={saving}
        />
      )}
    </PortalShell>
  );
}

function RequestDetailModal({
  request,
  onClose,
  onStatusChange,
  saving,
}: {
  request: RequestRecord;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  saving: string;
}) {
  const customer = request.customer_details;
  const service = request.service_details;
  const id = String(request.id);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border border-ivory/15 bg-[oklch(0.1_0.008_275)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-ivory/10 p-6">
          <div>
            <p className="whisper text-champagne">
              {val(request.request_number)} · {val(request.request_mode, "ENQUIRY")}
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ivory">{val(request.service_type)}</h2>
            <p className="mt-1 text-sm text-ivory/50">
              {val(customer?.name ?? request.customer_id)} · {val(customer?.email)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={String(request.status)}
              disabled={saving === id}
              onChange={(e) => void onStatusChange(id, e.target.value)}
              className="h-9 border border-champagne/50 bg-midnight px-3 font-sans text-xs tracking-[0.1em] text-ivory outline-none focus:border-champagne disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center border border-ivory/20 text-xl text-ivory/60 hover:border-champagne hover:text-champagne"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 [scrollbar-color:var(--color-gold)_transparent] [scrollbar-width:thin] space-y-6">
          {/* Trip details */}
          <section>
            <p className="whisper text-champagne mb-3">TRIP DETAILS</p>
            <div className="grid gap-3 text-sm text-ivory/65 sm:grid-cols-2">
              <span>Departure: {val(request.departure)}</span>
              <span>Destination: {val(request.destination)}</span>
              <span>Date: {val(request.start_date)}</span>
              <span>Return: {val(request.end_date)}</span>
              <span>Passengers: {val(request.people_count)}</span>
              <span>Trip type: {val(request.trip_type)}</span>
              <span>
                Budget: {val(request.currency)} {val(request.budget)}
              </span>
              <span>Mode: {val(request.request_mode, "ENQUIRY")}</span>
            </div>
            {request.additional_requirements && (
              <p className="mt-3 text-sm text-ivory/55 border border-ivory/10 p-3">
                {String(request.additional_requirements)}
              </p>
            )}
          </section>

          {/* Service details */}
          {service && Object.keys(service).length > 0 && (
            <section>
              <p className="whisper text-champagne mb-3">SERVICE / FLIGHT DETAILS</p>
              {String(request["service_type"]) === "EVENT_AVIATION" ? (
                <EventRequestDetails serviceDetails={service} />
              ) : (
                <div className="grid gap-3 text-sm text-ivory/65 sm:grid-cols-2">
                  {Object.entries(service).map(([k, v]) => (
                    <span key={k}>
                      {k.replace(/_/g, " ")}: {val(v)}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Customer details */}
          <CustomerDetailsSection customer={customer} />

          <RequestDocumentsSection documents={request.request_documents} />
          <RequestActivityAndBookingSection requestId={id} />

          {/* Trip questions from sales */}
          <TripQuestionsSection requestId={id} request={request} />

          {/* Passenger manifest with full document review */}
          <section>
            <PassengerCompliancePanel requestId={id} canReview />
          </section>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailsSection({ customer }: { customer: CustomerDetails | null | undefined }) {
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");

  async function viewDoc() {
    const path = customer?.identity_doc;
    if (!path) return;
    setDocLoading(true);
    setDocError("");
    try {
      const url = await getIdentityDocUrl(String(path));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Unable to open document.");
    } finally {
      setDocLoading(false);
    }
  }

  return (
    <section>
      <p className="whisper text-champagne mb-3">CUSTOMER DETAILS</p>
      <div className="grid gap-3 text-sm text-ivory/65 sm:grid-cols-2">
        <span>Name: {val(customer?.name)}</span>
        <span>Email: {val(customer?.email)}</span>
        <span>Mobile: {val(customer?.mobile)}</span>
        <span>Country: {val(customer?.country)}</span>
        <div className="flex items-center gap-3">
          <span>Identity doc: {customer?.identity_doc ? "Uploaded" : "Not uploaded"}</span>
          {customer?.identity_doc && (
            <button
              type="button"
              disabled={docLoading}
              onClick={() => void viewDoc()}
              className="border border-champagne/40 px-3 py-1 whisper text-[0.58rem] text-champagne hover:bg-champagne/10 disabled:opacity-40"
            >
              {docLoading ? "OPENING..." : "VIEW"}
            </button>
          )}
        </div>
      </div>
      {docError && <p className="mt-2 text-xs text-red-200">{docError}</p>}
    </section>
  );
}

type RequestDocument = Record<string, unknown> & {
  id?: string;
  storage_path?: string;
  original_filename?: string;
  document_type?: string;
  mime_type?: string;
  file_size?: number;
};

function RequestDocumentsSection({ documents }: { documents: unknown }) {
  const [error, setError] = useState("");
  const rows = Array.isArray(documents) ? (documents as RequestDocument[]) : [];

  async function openDocument(document: RequestDocument) {
    const path = String(document.storage_path ?? "");
    if (!path) return;
    setError("");
    try {
      const { data, error: urlError } = await supabase.storage
        .from("request-documents")
        .createSignedUrl(path, 300);
      if (urlError) throw urlError;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create a secure document link.");
    }
  }

  return (
    <section>
      <p className="whisper text-champagne mb-3">REQUEST DOCUMENTS</p>
      {!rows.length ? (
        <p className="text-sm text-ivory/40">No request documents uploaded.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((document) => {
            const id = String(document.id ?? document.storage_path);
            return (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 border border-ivory/10 p-3"
              >
                <div className="text-sm text-ivory/65">
                  <p>{val(document.original_filename, "Uploaded document")}</p>
                  <p className="mt-1 text-xs text-ivory/35">
                    {val(document.document_type)} · {val(document.mime_type)} ·{" "}
                    {val(document.file_size)} bytes
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!document.storage_path}
                  onClick={() => void openDocument(document)}
                  className="border border-champagne/40 px-3 py-2 whisper text-[0.58rem] text-champagne hover:bg-champagne/10 disabled:opacity-40"
                >
                  VIEW (5 MIN)
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </section>
  );
}

function RequestActivityAndBookingSection({ requestId }: { requestId: string }) {
  const [timeline, setTimeline] = useState<RequestTimelineEvent[]>([]);
  const [booking, setBooking] = useState<RequestBooking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const [timelineResult, bookingResult] = await Promise.all([
        supabase
          .from("request_timeline")
          .select("id, event_type, message, created_at, actor_role")
          .eq("request_id", requestId)
          .order("created_at", { ascending: false }),
        supabase.from("booking_records").select("*").eq("request_id", requestId).maybeSingle(),
      ]);
      if (!active) return;
      if (timelineResult.error) setError(timelineResult.error.message);
      else setTimeline((timelineResult.data ?? []) as RequestTimelineEvent[]);
      if (bookingResult.error) setError((current) => current || bookingResult.error.message);
      else setBooking(bookingResult.data as RequestBooking | null);
    })();
    return () => {
      active = false;
    };
  }, [requestId]);

  return (
    <>
      <section>
        <p className="whisper text-champagne mb-3">BOOKING RECORD</p>
        {booking ? (
          <div className="grid gap-3 border border-ivory/10 p-4 text-sm text-ivory/65 sm:grid-cols-2">
            <span>PNR: {val(booking.pnr)}</span>
            <span>Status: {val(booking.booking_status)}</span>
            <span>Booking date: {val(booking.booking_date)}</span>
            <span>Travel date: {val(booking.travel_date)}</span>
            <span>Departure: {val(booking.departure)}</span>
            <span>Destination: {val(booking.destination)}</span>
            <span>
              Aircraft: {val(booking.aircraft_kind)} {val(booking.aircraft_model, "")}
            </span>
          </div>
        ) : (
          <p className="text-sm text-ivory/40">No booking record exists for this request.</p>
        )}
      </section>
      <section>
        <p className="whisper text-champagne mb-3">REQUEST TIMELINE</p>
        {timeline.length ? (
          <ol className="space-y-2">
            {timeline.map((event) => (
              <li key={String(event.id)} className="border-l border-champagne/30 pl-3">
                <p className="text-sm text-ivory/70">{val(event.message)}</p>
                <p className="mt-1 text-xs text-ivory/35">
                  {val(event.event_type)} · {val(event.actor_role)} · {val(event.created_at)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ivory/40">No timeline activity recorded.</p>
        )}
        {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
      </section>
    </>
  );
}

type RequestTimelineEvent = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
  actor_role: string | null;
};

type RequestBooking = {
  pnr: string;
  booking_status: string;
  booking_date: string;
  travel_date: string | null;
  departure: string | null;
  destination: string | null;
  aircraft_kind: string | null;
  aircraft_model: string | null;
};

const TRIP_QUESTIONS: {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
}[] = [
  {
    key: "preferred_departure",
    label: "Preferred departure city / airport",
    placeholder: "e.g. London Heathrow",
  },
  { key: "preferred_destination", label: "Preferred destination", placeholder: "e.g. Monaco" },
  { key: "travel_date", label: "Travel date", placeholder: "e.g. 2025-09-15", type: "date" },
  {
    key: "return_date",
    label: "Return date (if applicable)",
    placeholder: "e.g. 2025-09-18",
    type: "date",
  },
  { key: "passenger_count", label: "Number of passengers", placeholder: "e.g. 4", type: "number" },
  {
    key: "aircraft_preference",
    label: "Aircraft preference",
    placeholder: "e.g. Global 7500, helicopter",
  },
  {
    key: "catering_requirements",
    label: "Catering / dietary requirements",
    placeholder: "e.g. Halal, vegan",
  },
  {
    key: "ground_transport",
    label: "Ground transport needed?",
    placeholder: "e.g. Yes — Mayfair to FBO",
  },
  {
    key: "special_requests",
    label: "Any special requests",
    placeholder: "e.g. flowers, specific crew",
  },
];

function TripQuestionsSection({
  requestId,
  request,
}: {
  requestId: string;
  request: RequestRecord;
}) {
  const existing = request.service_details ?? {};
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(TRIP_QUESTIONS.map(({ key }) => [key, String(existing[key] ?? "")])),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    const { error: err } = await supabase
      .from("requests")
      .update({
        service_details: { ...existing, ...answers },
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (err) setError(err.message);
    else setSaved(true);
    setSaving(false);
  }

  return (
    <section>
      <p className="whisper text-champagne mb-1">TRIP QUESTIONS</p>
      <p className="mb-4 text-xs text-ivory/40">
        Fill in or update trip details on behalf of the customer.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TRIP_QUESTIONS.map(({ key, label, placeholder, type }) => (
          <label key={key} className="block">
            <span className="whisper text-ivory/45">{label}</span>
            <input
              type={type ?? "text"}
              value={answers[key]}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              className="field mt-1"
            />
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-red-200">{error}</p>}
      {saved && <p className="mt-3 text-xs text-green-200">Trip details saved.</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-4 border border-champagne/40 px-4 py-2 whisper text-champagne hover:bg-champagne/10 disabled:opacity-40"
      >
        {saving ? "SAVING..." : "SAVE TRIP DETAILS"}
      </button>
    </section>
  );
}
