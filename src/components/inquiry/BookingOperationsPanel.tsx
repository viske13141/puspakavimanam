import { useEffect, useState, type FormEvent } from "react";
import {
  calculateWeightBalance,
  completePassengerCheckin,
  getBookingForRequest,
  getPassengerOperations,
  issuePassengerTicket,
  briefingItems,
  recordPassengerHeadsetIssue,
  recordPhysicalWeighing,
  reviewPassengerTicketName,
  savePassengerBriefing,
  setBookingPhotographyPolicy,
  saveWeightDeclaration,
  type BriefingKey,
  type BookingRecord,
  type Briefing,
  type Checkin,
  type PhysicalWeighing,
  type WeightBalance,
  type WeightDeclaration,
} from "@/lib/booking-compliance-service";
import type { Passenger } from "@/lib/passenger-service";
import { BookingDiversionPanel } from "@/components/inquiry/BookingDiversionPanel";
import { brand } from "@/content/site";

function badgeClass(status: string) {
  if (["VALID", "CLEARED", "VERIFIED"].includes(status))
    return "border-green-300/30 text-green-200";
  if (["OVER_LIMIT", "BLOCKED", "MISMATCH", "REQUIRES_REVIEW"].includes(status))
    return "border-red-300/30 text-red-200";
  return "border-champagne/30 text-champagne";
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function ticketWindow(popup: Window, ticketNumber: string, ticketData: Record<string, unknown>) {
  const entries = Object.entries(ticketData).filter(
    ([, value]) => value !== null && value !== undefined,
  );
  const rows = entries
    .map(
      ([key, value]) =>
        `<tr><td>${escapeHtml(key.replaceAll("_", " "))}</td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(ticketNumber)}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:48px auto;color:#171717}h1{font-size:32px}table{width:100%;border-collapse:collapse;text-transform:capitalize}td{border-top:1px solid #ccc;padding:12px 4px}small{color:#666}button{margin:24px 0;padding:10px 16px}</style></head><body><small>HELITEJET E-TICKET</small><h1>${escapeHtml(ticketNumber)}</h1><table>${rows}</table><button onclick="window.print()">Print / Save as PDF</button><p><small>Generated from the stored booking and passenger record. This ticket does not replace operational approval or physical check-in.</small></p></body></html>`;
  popup.opener = null;
  popup.document.write(html);
  popup.document.close();
}

export function BookingOperationsPanel({
  requestId,
  passenger,
  canReview = false,
}: {
  requestId: string;
  passenger: Passenger;
  canReview?: boolean;
}) {
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [declaration, setDeclaration] = useState<WeightDeclaration | null>(null);
  const [weighing, setWeighing] = useState<PhysicalWeighing | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [weightBalance, setWeightBalance] = useState<WeightBalance | null>(null);
  const [bodyWeight, setBodyWeight] = useState("");
  const [baggageWeight, setBaggageWeight] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [bodyConfirmed, setBodyConfirmed] = useState(false);
  const [baggageConfirmed, setBaggageConfirmed] = useState(false);
  const [measuredBodyWeight, setMeasuredBodyWeight] = useState("");
  const [measuredBaggageWeight, setMeasuredBaggageWeight] = useState("");
  const [briefingState, setBriefingState] = useState<Record<BriefingKey, boolean>>(
    () =>
      Object.fromEntries(briefingItems.map(([key]) => [key, false])) as Record<
        BriefingKey,
        boolean
      >,
  );
  const [nameReviewNotes, setNameReviewNotes] = useState("");
  const [headsetProvided, setHeadsetProvided] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const currentBooking = await getBookingForRequest(requestId);
      setBooking(currentBooking);
      if (!currentBooking) return;
      const operations = await getPassengerOperations(currentBooking.id, passenger.id);
      setDeclaration(operations.declaration);
      setWeighing(operations.weighing);
      setBriefing(operations.briefing);
      setCheckin(operations.checkin);
      if (operations.declaration) {
        setBodyWeight(String(operations.declaration.body_weight_kg));
        setBaggageWeight(String(operations.declaration.hand_baggage_weight_kg));
        setSignatureName(operations.declaration.signature_name);
        setBodyConfirmed(operations.declaration.body_weight_confirmed);
        setBaggageConfirmed(operations.declaration.hand_baggage_confirmed);
      }
      if (operations.weighing) {
        setMeasuredBodyWeight(String(operations.weighing.measured_body_weight_kg));
        setMeasuredBaggageWeight(String(operations.weighing.measured_hand_baggage_weight_kg));
      }
      if (operations.briefing) {
        setBriefingState(
          Object.fromEntries(
            briefingItems.map(([key]) => [key, operations.briefing?.[key] ?? false]),
          ) as Record<BriefingKey, boolean>,
        );
        setHeadsetProvided(operations.briefing.headset_provided);
      }
      setNameReviewNotes(operations.checkin?.name_review_notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load booking operations.");
    }
  }

  useEffect(() => {
    void load();
  }, [requestId, passenger.id]);

  async function submitWeights(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    if (!bodyConfirmed || !baggageConfirmed || signatureName.trim().length < 2) {
      setError("Confirm both declarations and type your name as consent.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveWeightDeclaration({
        bookingId: booking.id,
        passengerId: passenger.id,
        bodyWeightKg: Number(bodyWeight),
        handBaggageWeightKg: Number(baggageWeight),
        bodyConfirmed,
        baggageConfirmed,
        signatureName,
      });
      setNotice("Weight declaration saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save weight declaration.");
    } finally {
      setSaving(false);
    }
  }

  async function submitBriefing(event: FormEvent) {
    event.preventDefault();
    if (
      !booking ||
      briefingItems.some(
        ([key]) => key !== "photography_drone_acknowledged" && !briefingState[key],
      ) ||
      (booking.photography_restrictions_applicable && !briefingState.photography_drone_acknowledged)
    ) {
      setError("Acknowledge every briefing item before continuing.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await savePassengerBriefing({
        bookingId: booking.id,
        passengerId: passenger.id,
        acknowledgements: briefingState,
        photographyRestrictionsApplicable: booking.photography_restrictions_applicable,
      });
      setNotice("Passenger briefing acknowledged.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save briefing.");
    } finally {
      setSaving(false);
    }
  }

  async function submitWeighing(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await recordPhysicalWeighing({
        bookingId: booking.id,
        passengerId: passenger.id,
        bodyWeightKg: Number(measuredBodyWeight),
        handBaggageWeightKg: Number(measuredBaggageWeight),
        verified: true,
      });
      setNotice("Physical weighing recorded without changing the original declaration.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record weighing.");
    } finally {
      setSaving(false);
    }
  }

  async function recalculate() {
    if (!booking) return;
    setSaving(true);
    setError("");
    try {
      setWeightBalance(await calculateWeightBalance(booking.id));
      setNotice("Weight-and-balance result refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to calculate weight and balance.");
    } finally {
      setSaving(false);
    }
  }

  async function clearCheckin() {
    setSaving(true);
    setError("");
    try {
      setCheckin(await completePassengerCheckin(passenger.id));
      setNotice("Check-in result refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete check-in.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePhotographyPolicy(applicable: boolean) {
    if (!booking) return;
    setSaving(true);
    setError("");
    try {
      await setBookingPhotographyPolicy(booking.id, applicable);
      setNotice("Photography and drone briefing policy updated for this booking.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update briefing policy.");
    } finally {
      setSaving(false);
    }
  }

  async function updateHeadsetIssue(provided: boolean) {
    if (!booking) return;
    setSaving(true);
    setError("");
    try {
      await recordPassengerHeadsetIssue(booking.id, passenger.id, provided);
      setHeadsetProvided(provided);
      setNotice("Headset/hearing-protection issue state recorded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record headset issue.");
    } finally {
      setSaving(false);
    }
  }

  async function resolveNameMatch(resolution: "VERIFIED" | "REQUIRES_REVIEW") {
    setSaving(true);
    setError("");
    try {
      setCheckin(
        await reviewPassengerTicketName({
          passengerId: passenger.id,
          resolution,
          notes: nameReviewNotes,
        }),
      );
      setNotice("Ticket-name review recorded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save name review.");
    } finally {
      setSaving(false);
    }
  }

  if (!booking)
    return (
      <p className="mt-4 border-t border-ivory/10 pt-4 text-xs text-ivory/40">
        PNR and operational checks become available when Sales confirms this booking.
      </p>
    );
  return (
    <div className="mt-4 border-t border-ivory/10 pt-4">
      <div className="flex flex-wrap gap-3 text-xs text-ivory/60">
        <span>
          PNR: <strong className="text-champagne">{booking.pnr}</strong>
        </span>
        <span>
          Sector:{" "}
          <strong className="text-ivory/80">
            {booking.departure ?? "TBC"} → {booking.destination ?? "TBC"}
          </strong>
        </span>
        <span>Booking: {booking.booking_status}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            const popup = window.open("", "_blank");
            if (!popup) {
              setError("Allow pop-ups to open the e-ticket.");
              return;
            }
            try {
              const ticket = await issuePassengerTicket(passenger.id);
              ticketWindow(popup, ticket.ticket_number, ticket.ticket_data);
              setNotice("E-ticket generated from stored booking data.");
            } catch (err) {
              popup.close();
              setError(err instanceof Error ? err.message : "Unable to generate e-ticket.");
            }
          }}
          className="border border-champagne/40 px-3 py-2 whisper text-champagne disabled:opacity-40"
        >
          GENERATE E-TICKET
        </button>
        {canReview && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => void recalculate()}
              className="border border-ivory/20 px-3 py-2 whisper text-ivory/65 disabled:opacity-40"
            >
              CALCULATE LOAD
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void clearCheckin()}
              className="border border-ivory/20 px-3 py-2 whisper text-ivory/65 disabled:opacity-40"
            >
              CHECK IN
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-3 border border-red-300/30 p-2 text-xs text-red-100">{error}</p>}
      {notice && (
        <p className="mt-3 border border-green-300/20 p-2 text-xs text-green-100">{notice}</p>
      )}
      {!canReview && (
        <>
          <form
            onSubmit={submitWeights}
            className="mt-4 grid gap-3 border border-ivory/10 p-3 sm:grid-cols-3"
          >
            <label>
              <span className="whisper text-ivory/45">Body weight (kg)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={bodyWeight}
                onChange={(event) => {
                  setBodyWeight(event.target.value);
                  setBodyConfirmed(false);
                }}
                className="field mt-2"
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Hand baggage (kg)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={baggageWeight}
                onChange={(event) => {
                  setBaggageWeight(event.target.value);
                  setBaggageConfirmed(false);
                }}
                className="field mt-2"
                required
              />
            </label>
            <label className="sm:col-span-3">
              <span className="whisper text-ivory/45">
                Type your full legal name as declaration consent
              </span>
              <input
                value={signatureName}
                onChange={(event) => setSignatureName(event.target.value)}
                className="field mt-2"
                required
                minLength={2}
                autoComplete="name"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-ivory/65 sm:col-span-3">
              <input
                type="checkbox"
                checked={bodyConfirmed}
                onChange={(event) => setBodyConfirmed(event.target.checked)}
                required
              />
              I confirm the declared body weight is accurate.
            </label>
            <label className="flex items-start gap-2 text-xs text-ivory/65 sm:col-span-3">
              <input
                type="checkbox"
                checked={baggageConfirmed}
                onChange={(event) => setBaggageConfirmed(event.target.checked)}
                required
              />
              I confirm the separate hand-baggage weight is accurate.
            </label>
            <button
              type="submit"
              disabled={
                saving || !bodyConfirmed || !baggageConfirmed || signatureName.trim().length < 2
              }
              className="self-end border border-champagne/40 px-3 py-2 whisper text-champagne disabled:opacity-40"
            >
              DECLARE WEIGHTS
            </button>
            <p className="text-xs text-ivory/45 sm:col-span-3">
              Both values are stored separately with your confirmation and timestamp. Declared:{" "}
              {declaration ? new Date(declaration.declared_at).toLocaleString() : "not yet"}
            </p>
          </form>
          <form onSubmit={submitBriefing} className="mt-4 border border-ivory/10 p-3">
            <p className="whisper text-champagne">PASSENGER BRIEFING</p>
            <p className="mt-2 text-xs leading-5 text-ivory/55">
              Operational conditions may change the destination, and delays or diversions may occur.
              Ground transport or onward arrangements are handled according to company policy. For
              assistance, contact {brand.email} or {brand.phone}.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {briefingItems
                .filter(
                  ([key]) =>
                    key !== "photography_drone_acknowledged" ||
                    booking.photography_restrictions_applicable,
                )
                .map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2 text-xs text-ivory/65">
                    <input
                      type="checkbox"
                      checked={briefingState[key]}
                      onChange={(event) =>
                        setBriefingState((current) => ({ ...current, [key]: event.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
            </div>
            <p className="mt-3 text-xs text-ivory/45">
              Photography/drone briefing:{" "}
              {booking.photography_restrictions_applicable
                ? "required for this operation"
                : "not marked applicable by operations"}
            </p>
            <button
              type="submit"
              disabled={
                saving ||
                briefingItems.some(
                  ([key]) => key !== "photography_drone_acknowledged" && !briefingState[key],
                ) ||
                (booking.photography_restrictions_applicable &&
                  !briefingState.photography_drone_acknowledged)
              }
              className="mt-3 border border-champagne/40 px-3 py-2 whisper text-champagne disabled:opacity-40"
            >
              ACKNOWLEDGE BRIEFING
            </button>
          </form>
        </>
      )}
      {canReview && (
        <>
          <BookingDiversionPanel bookingId={booking.id} originalDestination={booking.destination} />
          <form
            onSubmit={submitWeighing}
            className="mt-4 grid gap-3 border border-ivory/10 p-3 sm:grid-cols-3"
          >
            <label>
              <span className="whisper text-ivory/45">Measured body (kg)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={measuredBodyWeight}
                onChange={(event) => setMeasuredBodyWeight(event.target.value)}
                className="field mt-2"
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Measured baggage (kg)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={measuredBaggageWeight}
                onChange={(event) => setMeasuredBaggageWeight(event.target.value)}
                className="field mt-2"
                required
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="self-end border border-ivory/30 px-3 py-2 whisper text-ivory/70 disabled:opacity-40"
            >
              RECORD WEIGHING
            </button>
            <p className="text-xs text-ivory/45 sm:col-span-3">
              Declared:{" "}
              {declaration
                ? `${declaration.body_weight_kg} kg body / ${declaration.hand_baggage_weight_kg} kg hand baggage`
                : "not recorded"}
              . Latest measured values are retained separately:{" "}
              {weighing ? new Date(weighing.performed_at).toLocaleString() : "not recorded"}
            </p>
            {declaration && (
              <p className="text-xs text-ivory/45 sm:col-span-3">
                Difference:{" "}
                {Math.abs(Number(measuredBodyWeight || 0) - declaration.body_weight_kg).toFixed(2)}{" "}
                kg body ·{" "}
                {Math.abs(
                  Number(measuredBaggageWeight || 0) - declaration.hand_baggage_weight_kg,
                ).toFixed(2)}{" "}
                kg hand baggage. Follow operator procedure for discrepancies; no automatic tolerance
                is assumed.
              </p>
            )}
          </form>
          {weightBalance && (
            <p className="mt-3 border border-ivory/10 p-3 text-xs text-ivory/60">
              Load: {weightBalance.total_passenger_weight_kg} kg passengers +{" "}
              {weightBalance.total_baggage_weight_kg} kg baggage · Limit:{" "}
              {weightBalance.applicable_payload_limit_kg ?? "not configured"} kg ·{" "}
              <span className={`border px-2 py-1 ${badgeClass(weightBalance.calculation_status)}`}>
                {weightBalance.calculation_status}
              </span>
              <br />
              {weightBalance.calculation_notes}
            </p>
          )}
          {checkin && (
            <div className="mt-3 border border-ivory/10 p-3 text-xs text-ivory/60">
              Check-in:{" "}
              <span className={`border px-2 py-1 ${badgeClass(checkin.checkin_status)}`}>
                {checkin.checkin_status}
              </span>{" "}
              · Name: {checkin.name_match_status} · Original document:{" "}
              {checkin.original_document_verified ? "verified" : "pending"} · Weight:{" "}
              {checkin.weight_verified ? "verified" : "pending"} · Briefing:{" "}
              {checkin.briefing_completed ? "complete" : "pending"}
              {checkin.notes && <p className="mt-2 text-red-100/80">{checkin.notes}</p>}
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void resolveNameMatch("VERIFIED");
            }}
            className="mt-3 border border-ivory/10 p-3"
          >
            <p className="text-xs text-ivory/65">
              Compare the passenger's original physical identity document against the issued ticket.
              The automated comparison only compares stored names and does not verify identity. Do
              not change the passenger name to force a match.
            </p>
            <textarea
              value={nameReviewNotes}
              onChange={(event) => setNameReviewNotes(event.target.value)}
              className="field mt-3"
              rows={2}
              minLength={3}
              placeholder="Manual review notes"
              required
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || nameReviewNotes.trim().length < 3}
                className="border border-green-300/30 px-3 py-2 whisper text-green-200 disabled:opacity-40"
              >
                RECORD IDENTITY VERIFIED
              </button>
              <button
                type="button"
                disabled={saving || nameReviewNotes.trim().length < 3}
                onClick={() => void resolveNameMatch("REQUIRES_REVIEW")}
                className="border border-red-300/30 px-3 py-2 whisper text-red-200 disabled:opacity-40"
              >
                KEEP FOR MANUAL REVIEW
              </button>
            </div>
          </form>
          {canReview && (
            <div className="mt-3 grid gap-2 border border-ivory/10 p-3 text-xs text-ivory/65">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={headsetProvided}
                  disabled={saving}
                  onChange={(event) => void updateHeadsetIssue(event.target.checked)}
                />
                Headset/hearing-protection equipment provided to passenger
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={booking.photography_restrictions_applicable}
                  disabled={saving}
                  onChange={(event) => void updatePhotographyPolicy(event.target.checked)}
                />
                Photography/drone restrictions apply to this operation (staff-configured)
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}
