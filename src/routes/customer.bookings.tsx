import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { customerNav } from "@/lib/portal-nav";
import { supabase } from "@/integrations/supabase/client";
import { PassengerCompliancePanel } from "@/components/inquiry/PassengerCompliancePanel";
import {
  getBookingForRequest,
  issuePassengerTicket,
  listBookingTickets,
  type BookingRecord,
  type BookingTicket,
} from "@/lib/booking-compliance-service";
import { listRequestPassengers } from "@/lib/passenger-service";

export const Route = createFileRoute("/customer/bookings")({
  beforeLoad: () => {
    if (typeof window !== "undefined") return requireRoleAccess(["CUSTOMER"]);
  },
  component: CustomerBookings,
});

type Booking = {
  id: string;
  request_number: string;
  status: string;
  service_type: string;
  request_mode: string;
  customer_details: Record<string, unknown>;
  service_details: Record<string, unknown>;
  departure: string | null;
  destination: string | null;
  start_date: string | null;
  people_count: number;
  created_at: string;
};

function statusColor(status: string) {
  if (status === "BOOKED" || status === "COMPLETED") return "border-green-300/40 text-green-200";
  if (status === "CANCELLED") return "border-red-300/40 text-red-200";
  if (status === "DRAFT") return "border-ivory/20 text-ivory/40";
  return "border-champagne/40 text-champagne";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: "Draft — complete your details",
    SUBMITTED: "Submitted — awaiting sales review",
    UNDER_REVIEW: "Under review by our team",
    SALES_CONTACTED: "Sales has contacted you",
    OPTIONS_FOUND: "Options found — check your email",
    QUOTE_SENT: "Quote sent — check your email",
    BOOKED: "Confirmed booking",
    COMPLETED: "Journey completed",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

/* ── PDF ticket generator ─────────────────────────────────────────── */
function escapeHtml(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function openTicketPdf(ticket: BookingTicket, booking: BookingRecord) {
  const popup = window.open("", "_blank");
  if (!popup) { alert("Allow pop-ups to download your ticket."); return; }
  const rows = Object.entries(ticket.ticket_data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `<tr><td>${escapeHtml(k.replace(/_/g, " "))}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>HELITEJET E-TICKET ${escapeHtml(ticket.ticket_number)}</title>
<style>
  @media print { button { display:none } }
  body { font-family: Georgia, serif; max-width: 680px; margin: 48px auto; color: #111; }
  h1 { font-size: 28px; margin: 0; }
  .sub { color: #666; font-size: 13px; margin: 4px 0 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { border-top: 1px solid #ddd; padding: 10px 4px; font-size: 14px; text-transform: capitalize; }
  td:first-child { color: #555; width: 45%; }
  .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  button { margin: 24px 0; padding: 10px 20px; background: #111; color: #fff; border: none; cursor: pointer; font-size: 14px; }
</style></head><body>
<p class="sub">HELITEJET PRIVATE AVIATION · E-TICKET</p>
<h1>${escapeHtml(ticket.ticket_number)}</h1>
<p class="sub">
  ${escapeHtml(booking.departure ?? "TBC")} → ${escapeHtml(booking.destination ?? "TBC")} ·
  ${escapeHtml(booking.travel_date ?? "Date TBC")} · PNR: ${escapeHtml(booking.pnr)}
</p>
<table>${rows}</table>
<button onclick="window.print()">⬇ Download / Print as PDF</button>
<p class="footer">
  This e-ticket is generated from the stored booking and passenger record.
  It does not replace operational approval or physical check-in.
  For assistance: concierge@helitejet.com
</p>
</body></html>`;
  popup.opener = null;
  popup.document.write(html);
  popup.document.close();
}

/* ── Track flight modal ───────────────────────────────────────────── */
function TrackModal({ booking, onClose }: { booking: BookingRecord; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl border border-ivory/15 bg-[oklch(0.1_0.008_275)] p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-ivory/10 pb-5">
          <div>
            <p className="whisper text-champagne">FLIGHT TRACKING</p>
            <h2 className="mt-2 font-serif text-3xl text-ivory">
              {booking.departure ?? "TBC"} → {booking.destination ?? "TBC"}
            </h2>
            <p className="mt-1 text-xs text-ivory/45">PNR: {booking.pnr} · {booking.booking_status}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-ivory/50 hover:text-champagne"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {/* Visual route map */}
        <div className="relative mt-6 h-56 overflow-hidden border border-champagne/20 bg-[radial-gradient(circle_at_25%_30%,rgba(220,190,120,.14)_1px,transparent_2px),radial-gradient(circle_at_70%_65%,rgba(220,190,120,.12)_1px,transparent_2px)] bg-[length:34px_34px]">
          <div className="absolute left-[14%] top-[30%] h-3 w-3 rounded-full bg-champagne shadow-[0_0_20px_rgba(230,200,130,.8)]" />
          <div className="absolute right-[14%] bottom-[26%] h-3 w-3 rounded-full bg-champagne shadow-[0_0_20px_rgba(230,200,130,.8)]" />
          <div className="absolute left-[17%] top-[37%] h-px w-[66%] rotate-[22deg] bg-champagne/70" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-champagne/40 bg-obsidian/80 px-3 py-2 whisper text-[0.55rem] text-champagne">
            FLIGHT ROUTE
          </div>
          <p className="absolute bottom-3 left-4 whisper text-[0.55rem] text-ivory/40">DEPARTURE</p>
          <p className="absolute right-4 top-3 whisper text-[0.55rem] text-ivory/40">DESTINATION</p>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-ivory/60 sm:grid-cols-2">
          <span>Aircraft: {booking.aircraft_model ?? "Assigned by concierge"}</span>
          <span>Type: {booking.aircraft_kind ?? "Private aviation"}</span>
          <span>Travel date: {booking.travel_date ?? "To be confirmed"}</span>
          <span>Status: {booking.booking_status}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */
function CustomerBookings() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  // Complete booking form
  const [completing, setCompleting] = useState<Booking | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Ticket download
  const [ticketLoading, setTicketLoading] = useState("");
  const [ticketError, setTicketError] = useState("");

  // Track modal
  const [tracking, setTracking] = useState<BookingRecord | null>(null);
  const [trackLoading, setTrackLoading] = useState("");

  async function loadBookings() {
    const { data, error: err } = await supabase
      .from("requests")
      .select("id,request_number,status,service_type,request_mode,customer_details,service_details,departure,destination,start_date,people_count,created_at")
      .eq("request_mode", "BOOKING")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setBookings((data ?? []) as Booking[]);
  }

  useEffect(() => {
    void loadBookings();
    const channel = supabase
      .channel(`customer-bookings-${profile?.id ?? "x"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `customer_id=eq.${profile?.id ?? ""}` },
        () => { void loadBookings(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile?.id]);

  function openComplete(booking: Booking) {
    const d = booking.customer_details ?? {};
    setCompleting(booking);
    setName(String(d.name ?? ""));
    setEmail(String(d.email ?? profile?.email ?? ""));
    setMobile(String(d.mobile ?? ""));
    setFile(null);
    setError("");
  }

  async function submitBooking(e: FormEvent) {
    e.preventDefault();
    if (!completing || !name.trim() || !email.trim() || !mobile.trim()) {
      setError("Name, email and mobile are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let identityDoc = completing.customer_details.identity_doc ?? null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `identity/${profile?.id}/${completing.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("request-documents").upload(path, file);
        if (upErr) throw upErr;
        identityDoc = path;
      }
      const { error: updErr } = await supabase
        .from("requests")
        .update({
          status: "SUBMITTED",
          customer_details: {
            ...completing.customer_details,
            name: name.trim(),
            email: email.trim(),
            mobile: mobile.trim(),
            identity_doc: identityDoc,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", completing.id);
      if (updErr) throw updErr;
      setCompleting(null);
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit booking.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadTicket(booking: Booking) {
    setTicketLoading(booking.id);
    setTicketError("");
    try {
      const bookingRecord = await getBookingForRequest(booking.id);
      if (!bookingRecord) { setTicketError("Booking record not found."); return; }
      const passengers = await listRequestPassengers(booking.id);
      if (!passengers.length) { setTicketError("No passengers found for this booking."); return; }
      // Issue ticket for first passenger (or all)
      const tickets = await listBookingTickets(bookingRecord.id);
      let ticket = tickets[0];
      if (!ticket) {
        ticket = await issuePassengerTicket(passengers[0].id);
      }
      openTicketPdf(ticket, bookingRecord);
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : "Unable to generate ticket.");
    } finally {
      setTicketLoading("");
    }
  }

  async function openTrack(booking: Booking) {
    setTrackLoading(booking.id);
    try {
      const record = await getBookingForRequest(booking.id);
      if (record) setTracking(record);
    } catch {
      // ignore
    } finally {
      setTrackLoading("");
    }
  }

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <PortalShell title="Bookings" nav={customerNav} onLogout={() => void handleLogout()}>
      {error && <p className="mb-5 border border-red-300/30 p-3 text-sm text-red-200">{error}</p>}
      {ticketError && (
        <p className="mb-5 border border-red-300/30 p-3 text-sm text-red-200">{ticketError}</p>
      )}

      <div className="space-y-6">
        {bookings.map((booking) => (
          <article key={booking.id} className="border border-ivory/10 bg-white/[0.02]">
            {/* Booking header */}
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <p className="whisper text-champagne">
                  {booking.request_number} · AVIATION BOOKING
                </p>
                <h2 className="mt-2 font-serif text-2xl text-ivory">
                  {booking.departure ?? "TBC"} → {booking.destination ?? "TBC"}
                </h2>
                <p className="mt-1 text-sm text-ivory/50">
                  {booking.start_date ?? "Date TBC"} · {booking.people_count} passenger{booking.people_count !== 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-xs text-ivory/35">
                  Created {new Date(booking.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`border px-3 py-1 whisper text-[0.58rem] ${statusColor(booking.status)}`}>
                  {booking.status}
                </span>
                <p className="text-xs text-ivory/45">{statusLabel(booking.status)}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 border-t border-ivory/10 px-5 py-4">
              {booking.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => openComplete(booking)}
                  className="border border-champagne/50 px-4 py-2 whisper text-champagne hover:bg-champagne/10"
                >
                  COMPLETE & SUBMIT →
                </button>
              )}
              {booking.status === "BOOKED" && (
                <>
                  <button
                    type="button"
                    disabled={ticketLoading === booking.id}
                    onClick={() => void downloadTicket(booking)}
                    className="border border-green-300/40 px-4 py-2 whisper text-green-200 hover:bg-green-300/10 disabled:opacity-40"
                  >
                    {ticketLoading === booking.id ? "GENERATING..." : "⬇ DOWNLOAD TICKET"}
                  </button>
                  <button
                    type="button"
                    disabled={trackLoading === booking.id}
                    onClick={() => void openTrack(booking)}
                    className="border border-champagne/40 px-4 py-2 whisper text-champagne hover:bg-champagne/10 disabled:opacity-40"
                  >
                    {trackLoading === booking.id ? "LOADING..." : "✈ TRACK FLIGHT"}
                  </button>
                </>
              )}
            </div>

            {/* Passenger manifest */}
            <div className="border-t border-ivory/10 px-5 pb-5">
              <PassengerCompliancePanel requestId={booking.id} />
            </div>
          </article>
        ))}

        {!bookings.length && (
          <p className="border border-dashed border-ivory/10 p-10 text-center text-sm text-ivory/35">
            No booking requests yet.
          </p>
        )}
      </div>

      {/* Complete booking modal */}
      {completing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={submitBooking}
            className="w-full max-w-lg border border-ivory/15 bg-[oklch(0.1_0.008_275)] p-7"
          >
            <p className="whisper text-champagne">COMPLETE BOOKING</p>
            <h2 className="mt-2 font-serif text-3xl text-ivory">Submit your details</h2>
            <p className="mt-2 text-sm text-ivory/50">
              Once submitted, our sales team will review and confirm your booking.
            </p>

            {error && (
              <p className="mt-4 border border-red-300/30 p-3 text-sm text-red-100">{error}</p>
            )}

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="whisper text-ivory/50">Full name</span>
                <input className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="block">
                <span className="whisper text-ivory/50">Email</span>
                <input className="field mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="block">
                <span className="whisper text-ivory/50">Mobile number</span>
                <input className="field mt-2" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
              </label>
              <div>
                <span className="whisper text-ivory/50">Identity proof (optional)</span>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="border border-ivory/20 px-4 py-2 whisper text-ivory/60 hover:border-champagne hover:text-champagne"
                  >
                    {file?.name ?? "UPLOAD DOCUMENT"}
                  </button>
                  {file && (
                    <button type="button" onClick={() => setFile(null)} className="text-xs text-ivory/40 hover:text-red-200">
                      remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-ivory/35">PDF, JPG or PNG · max 10 MB</p>
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-ivory/10 pt-5">
              <button
                type="button"
                onClick={() => setCompleting(null)}
                className="whisper text-ivory/40 hover:text-ivory"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={saving}
                className="border border-champagne/50 px-5 py-2 whisper text-champagne hover:bg-champagne/10 disabled:opacity-40"
              >
                {saving ? "SUBMITTING..." : "SUBMIT TO SALES →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Track flight modal */}
      {tracking && <TrackModal booking={tracking} onClose={() => setTracking(null)} />}
    </PortalShell>
  );
}
