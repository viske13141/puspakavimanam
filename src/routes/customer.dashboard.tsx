import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { customerNav as nav } from "@/lib/portal-nav";
import { supabase } from "@/integrations/supabase/client";
import {
  clearAircraftSelection,
  createAircraftDraft,
  deleteAircraftDraft,
  listOpenAircraftDrafts,
  readAircraftSelection,
  type AircraftSelection,
  type CustomerBookingDraft,
} from "@/lib/aircraft-booking-service";

export const Route = createFileRoute("/customer/dashboard")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") await requireRoleAccess(["CUSTOMER"]);
  },
  component: CustomerDashboard,
});

function CustomerDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [entitlement, setEntitlement] = useState<{ subscription_status: string; subscription_plan: string | null; credits_remaining: number } | null>(null);
  const [pendingBooking, setPendingBooking] = useState<{ id: string; request_number: string; status: string } | null>(null);
  const [flightDrafts, setFlightDrafts] = useState<CustomerBookingDraft[]>([]);
  const [anonymousSelection, setAnonymousSelection] = useState<AircraftSelection | null>(null);
  const [draftError, setDraftError] = useState("");
  const [draftAction, setDraftAction] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    void supabase.from("customer_entitlements").select("subscription_status,subscription_plan,credits_remaining").eq("customer_id", profile.id).maybeSingle()
      .then(({ data }) => setEntitlement(data));
    void supabase.from("requests").select("id,request_number,status").eq("customer_id", profile.id).eq("request_mode", "BOOKING").in("status", ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SALES_CONTACTED", "OPTIONS_FOUND", "QUOTE_SENT"]).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setPendingBooking(data));
    void listOpenAircraftDrafts()
      .then(setFlightDrafts)
      .catch((error: unknown) => setDraftError(error instanceof Error ? error.message : "Unable to load flight drafts."));
    setAnonymousSelection(readAircraftSelection());
    const channel = supabase.channel(`dashboard-entitlement-${profile.id}`).on("postgres_changes", { event: "*", schema: "public", table: "customer_entitlements", filter: `customer_id=eq.${profile.id}` }, (payload) => {
      if (payload.new) setEntitlement(payload.new as typeof entitlement);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel(`dashboard-booking-${profile.id}`).on("postgres_changes", { event: "*", schema: "public", table: "requests", filter: `customer_id=eq.${profile.id}` }, (payload) => {
      if (payload.new && (payload.new as { request_mode?: string }).request_mode === "BOOKING") setPendingBooking(payload.new as typeof pendingBooking);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile?.id]);

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  async function importAnonymousSelection() {
    if (!profile?.id || !anonymousSelection) return;
    setDraftAction(true);
    setDraftError("");
    try {
      const draft = await createAircraftDraft(profile.id, anonymousSelection);
      clearAircraftSelection();
      setAnonymousSelection(null);
      setFlightDrafts((current) => [draft, ...current]);
      await navigate({ to: "/customer/flight-booking", search: { draftId: draft.id } });
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Unable to continue this flight selection.");
    } finally {
      setDraftAction(false);
    }
  }

  async function discardFlightDraft(id: string) {
    if (!window.confirm("Discard this flight booking draft? Submitted requests are not affected.")) return;
    setDraftAction(true);
    setDraftError("");
    try {
      await deleteAircraftDraft(id);
      setFlightDrafts((current) => current.filter((draft) => draft.id !== id));
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Unable to discard this draft.");
    } finally {
      setDraftAction(false);
    }
  }

  return (
    <PortalShell
      title={`Good evening, ${profile?.full_name?.split(" ")[0] ?? "member"}.`}
      nav={nav}
      onLogout={() => void handleLogout()}
    >
      <div className="grid gap-5 md:grid-cols-3">
        <div className="border border-champagne/30 bg-champagne/[0.06] p-6">
          <p className="whisper text-champagne">ACCESS</p>
          <p className="mt-4 font-serif text-2xl">{entitlement?.subscription_status === "ACTIVE" ? "Booking enabled" : `${entitlement?.credits_remaining ?? 0} enquiry credits`}</p>
          <p className="mt-2 text-xs text-ivory/45">{entitlement?.subscription_plan ?? "Choose a subscription or credits"}</p>
          <Link to="/customer/subscriptions" className="mt-4 inline-block whisper text-champagne hover:text-ivory">VIEW ACCOUNT →</Link>
        </div>
        <div className="border border-white/10 bg-white/[0.03] p-6">
          <p className="whisper text-ivory/50">Active requests</p>
          <p className="mt-4 font-serif text-4xl">0</p>
        </div>
        <div className="border border-white/10 bg-white/[0.03] p-6">
          <p className="whisper text-ivory/50">Pending quotes</p>
          <p className="mt-4 font-serif text-4xl">0</p>
        </div>
        <Link
          to="/customer/requests/new"
          className="border border-champagne/40 bg-champagne/10 p-6 transition-colors hover:bg-champagne/20"
        >
          <p className="whisper text-champagne">Begin</p>
          <p className="mt-4 font-serif text-3xl">New request →</p>
        </Link>
      </div>
      {pendingBooking && <div className="mt-6 border border-champagne/30 bg-champagne/[0.06] p-6"><p className="whisper text-champagne">PENDING BOOKING · {pendingBooking.request_number}</p><p className="mt-3 font-serif text-2xl text-ivory">Your subscription is active. Continue your flight booking.</p><p className="mt-2 text-sm text-ivory/50">Current status: {pendingBooking.status}</p><Link to="/customer/bookings" className="mt-5 inline-block border border-champagne/50 px-4 py-2 whisper text-champagne">CONTINUE BOOKING →</Link></div>}
      {(anonymousSelection || flightDrafts.length > 0) && <section className="mt-6 border border-champagne/30 bg-champagne/[0.06] p-6">
        <p className="whisper text-champagne">CONTINUE YOUR FLIGHT BOOKING</p>
        <h2 className="mt-3 font-serif text-2xl text-ivory">Your saved flight details</h2>
        {draftError && <p role="alert" className="mt-4 border border-red-300/30 p-3 text-sm text-red-100">{draftError}</p>}
        {anonymousSelection && <article className="mt-4 border border-white/10 p-4">
          <p className="text-sm text-ivory/70">{anonymousSelection.aircraft_type === "helicopter" ? "Helicopter" : "Private jet / aircraft"} · {anonymousSelection.passenger_count} passengers · {anonymousSelection.currency} {anonymousSelection.budget.toLocaleString()}</p>
          <p className="mt-2 text-xs text-ivory/40">This selection was saved before sign-in. Confirm to add it to your account.</p>
          <button type="button" disabled={draftAction} onClick={() => void importAnonymousSelection()} className="mt-4 border border-champagne/50 px-4 py-2 whisper text-champagne disabled:opacity-40">{draftAction ? "PLEASE WAIT…" : "CONTINUE BOOKING →"}</button>
        </article>}
        {flightDrafts.map((draft) => {
          const data = draft.draft_data;
          const progress = `${Math.min(100, Math.max(0, Math.round(((draft.current_step + 1) / 6) * 100)))}%`;
          return <article key={draft.id} className="mt-4 border border-white/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-sm text-ivory/70">{data.aircraft_type === "helicopter" ? "Helicopter" : "Private jet / aircraft"} · {data.passenger_count} passengers · {data.currency} {Number(data.budget).toLocaleString()}</p><p className="mt-2 text-xs text-ivory/40">Progress: {progress} · Updated {new Date(draft.updated_at).toLocaleString()}</p></div>
            <div className="flex gap-3"><Link to="/customer/flight-booking" search={{ draftId: draft.id }} className="border border-champagne/50 px-4 py-2 whisper text-champagne">CONTINUE BOOKING →</Link><button type="button" disabled={draftAction} onClick={() => void discardFlightDraft(draft.id)} className="px-3 py-2 text-xs text-red-200/70 disabled:opacity-40">Discard</button></div>
            </div>
          </article>;
        })}
      </section>}
    </PortalShell>
  );
}
