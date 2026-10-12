import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { CustomerRequestWizard } from "@/components/inquiry/CustomerRequestWizard";
import { customerNav as nav } from "@/lib/portal-nav";
import { listOpenAircraftDrafts, type CustomerBookingDraft } from "@/lib/aircraft-booking-service";

export const Route = createFileRoute("/customer/requests/new")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") await requireRoleAccess(["CUSTOMER"]);
  },
  component: NewRequest,
});

function NewRequest() {
  const { profile, user, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<CustomerBookingDraft[] | null>(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [error, setError] = useState("");

  async function createRequest() {
    if (!user?.id || role !== "CUSTOMER") {
      setError("Sign in with a customer account to start an aircraft booking.");
      return;
    }
    setLoadingDrafts(true);
    setError("");
    try {
      const openDrafts = await listOpenAircraftDrafts();
      if (!openDrafts.length) {
        await navigate({ to: "/customer/flight-booking", search: { startNew: true } });
        return;
      }
      setDrafts(openDrafts);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to check your saved bookings.",
      );
    } finally {
      setLoadingDrafts(false);
    }
  }

  function startSeparateBooking() {
    void navigate({ to: "/customer/flight-booking", search: { startNew: true } });
  }

  return (
    <PortalShell
      title="New request"
      nav={nav}
      headerAction={
        <button
          type="button"
          disabled={loadingDrafts || isLoading}
          onClick={() => void createRequest()}
          className="min-h-11 border border-champagne bg-champagne px-6 py-3 text-sm font-medium text-obsidian transition-colors hover:bg-ivory disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading
            ? "Loading your account…"
            : loadingDrafts
              ? "Checking saved bookings…"
              : "Create Request"}
        </button>
      }
    >
      <section className="mb-8 border border-champagne/35 bg-champagne/[0.06] p-6 sm:p-8">
        <div>
          <p className="whisper text-champagne">HELICOPTER & PRIVATE JET CHARTER</p>
          <h2 className="mt-3 font-serif text-3xl font-light text-ivory">
            Plan an aircraft booking
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ivory/55">
            Start a new charter request or resume a saved aircraft booking. Submission requests
            availability and pricing; it does not confirm a flight.
          </p>
        </div>
      </section>
      {error && (
        <p role="alert" className="mb-6 border border-red-300/30 p-4 text-sm text-red-100">
          {error}
        </p>
      )}
      {drafts && (
        <section
          aria-labelledby="aircraft-draft-choice"
          className="mb-8 border border-white/15 bg-white/[0.03] p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="whisper text-champagne">SAVED AIRCRAFT BOOKINGS</p>
              <h2 id="aircraft-draft-choice" className="mt-2 font-serif text-2xl text-ivory">
                Resume a booking or start another
              </h2>
              <p className="mt-2 text-sm text-ivory/50">
                Your saved details will not be replaced when you start a separate booking.
              </p>
            </div>
            <button
              type="button"
              onClick={startSeparateBooking}
              className="border border-champagne/50 px-4 py-2 text-xs text-champagne transition-colors hover:bg-champagne/10"
            >
              Start a separate booking
            </button>
            <button
              type="button"
              onClick={() => setDrafts(null)}
              className="px-3 py-2 text-xs text-ivory/50 transition-colors hover:text-ivory"
            >
              Close choices
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {drafts.map((draft) => (
              <article
                key={draft.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-white/10 p-4"
              >
                <div>
                  <p className="text-sm text-ivory">
                    {draft.draft_data.aircraft_type === "helicopter"
                      ? "Helicopter"
                      : draft.draft_data.aircraft_type === "flight"
                        ? "Private jet / aircraft"
                        : "Aircraft type not selected"}
                    {" · "}
                    {draft.draft_data.passenger_count} passengers
                    {draft.draft_data.budget > 0
                      ? ` · ${draft.draft_data.currency} ${draft.draft_data.budget.toLocaleString()}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-ivory/40">
                    Updated {new Date(draft.updated_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/customer/flight-booking",
                      search: { draftId: draft.id },
                    })
                  }
                  className="border border-champagne/50 px-4 py-2 text-xs text-champagne transition-colors hover:bg-champagne/10"
                >
                  Resume booking
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <CustomerRequestWizard profile={profile} />
    </PortalShell>
  );
}
