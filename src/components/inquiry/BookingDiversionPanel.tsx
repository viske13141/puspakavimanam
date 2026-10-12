import { useEffect, useState, type FormEvent } from "react";
import {
  listBookingDiversions,
  recordBookingDiversion,
  type BookingDiversion,
} from "@/lib/booking-compliance-service";

const reasons = [
  "WEATHER",
  "TECHNICAL",
  "MEDICAL",
  "FUEL",
  "PASSENGER_REQUEST",
  "ATC",
  "SECURITY",
  "OTHER",
] as const;

export function BookingDiversionPanel({
  bookingId,
  originalDestination,
}: {
  bookingId: string;
  originalDestination: string | null;
}) {
  const [diversions, setDiversions] = useState<BookingDiversion[]>([]);
  const [revisedDestination, setRevisedDestination] = useState("");
  const [reason, setReason] = useState<(typeof reasons)[number] | "">("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [picName, setPicName] = useState("");
  const [diversionTime, setDiversionTime] = useState("");
  const [atcFicNotified, setAtcFicNotified] = useState(false);
  const [dispatchNotified, setDispatchNotified] = useState(false);
  const [passengerCareAction, setPassengerCareAction] = useState("");
  const [landingPermissionStatus, setLandingPermissionStatus] =
    useState<BookingDiversion["landing_permission_status"]>("NOT_VERIFIED");
  const [reportingStatus, setReportingStatus] =
    useState<BookingDiversion["reporting_status"]>("NOT_ASSESSED");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setDiversions(await listBookingDiversions(bookingId));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load diversion records.");
    }
  }

  useEffect(() => {
    void load();
  }, [bookingId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason || !diversionTime) {
      setError("Choose a diversion reason and time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await recordBookingDiversion({
        bookingId,
        revisedDestination,
        reason,
        reasonDetails,
        picName,
        diversionTime: new Date(diversionTime).toISOString(),
        atcFicNotified,
        dispatchNotified,
        passengerCareAction,
        landingPermissionStatus,
        reportingStatus,
      });
      setRevisedDestination("");
      setReason("");
      setReasonDetails("");
      setPicName("");
      setDiversionTime("");
      setAtcFicNotified(false);
      setDispatchNotified(false);
      setPassengerCareAction("");
      setLandingPermissionStatus("NOT_VERIFIED");
      setReportingStatus("NOT_ASSESSED");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record diversion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="mt-4 border border-ivory/10 p-3">
      <summary className="cursor-pointer whisper text-champagne">
        DIVERSION / DESTINATION CHANGE
      </summary>
      <p className="mt-3 text-xs text-ivory/45">
        Recording only: notification checkboxes do not send ATC/FIC or dispatch messages, and
        landing permission is not externally verified.
      </p>
      {error && <p className="mt-3 border border-red-300/30 p-3 text-xs text-red-100">{error}</p>}
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="whisper text-ivory/45">Original destination</span>
          <input value={originalDestination ?? "Not recorded"} className="field mt-2" readOnly />
        </label>
        <label>
          <span className="whisper text-ivory/45">Revised destination</span>
          <input
            value={revisedDestination}
            onChange={(event) => setRevisedDestination(event.target.value)}
            className="field mt-2"
            required
          />
        </label>
        <label>
          <span className="whisper text-ivory/45">Reason</span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as typeof reason)}
            className="field mt-2"
            required
          >
            <option value="">Select reason</option>
            {reasons.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="whisper text-ivory/45">Diversion time</span>
          <input
            type="datetime-local"
            value={diversionTime}
            onChange={(event) => setDiversionTime(event.target.value)}
            className="field mt-2"
            required
          />
        </label>
        <label>
          <span className="whisper text-ivory/45">PIC name</span>
          <input
            value={picName}
            onChange={(event) => setPicName(event.target.value)}
            className="field mt-2"
            required
          />
        </label>
        <label>
          <span className="whisper text-ivory/45">Landing permission status</span>
          <select
            value={landingPermissionStatus}
            onChange={(event) =>
              setLandingPermissionStatus(
                event.target.value as BookingDiversion["landing_permission_status"],
              )
            }
            className="field mt-2"
          >
            <option value="NOT_VERIFIED">Not verified</option>
            <option value="PENDING">Pending</option>
            <option value="OBTAINED">Recorded as obtained</option>
            <option value="NOT_REQUIRED">Not required</option>
          </select>
        </label>
        <label>
          <span className="whisper text-ivory/45">Reporting status</span>
          <select
            value={reportingStatus}
            onChange={(event) =>
              setReportingStatus(event.target.value as BookingDiversion["reporting_status"])
            }
            className="field mt-2"
          >
            <option value="NOT_ASSESSED">Not assessed</option>
            <option value="NOT_REQUIRED">Not required</option>
            <option value="PENDING">Pending</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="REVIEW_REQUIRED">Review required</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-ivory/65">
          <input
            type="checkbox"
            checked={atcFicNotified}
            onChange={(event) => setAtcFicNotified(event.target.checked)}
          />
          ATC/FIC notification recorded
        </label>
        <label className="flex items-center gap-2 text-xs text-ivory/65">
          <input
            type="checkbox"
            checked={dispatchNotified}
            onChange={(event) => setDispatchNotified(event.target.checked)}
          />
          Dispatch notification recorded
        </label>
        <label className="sm:col-span-2">
          <span className="whisper text-ivory/45">Reason details</span>
          <textarea
            value={reasonDetails}
            onChange={(event) => setReasonDetails(event.target.value)}
            className="field mt-2"
            rows={2}
            required
          />
        </label>
        <label className="sm:col-span-2">
          <span className="whisper text-ivory/45">Passenger-care action</span>
          <textarea
            value={passengerCareAction}
            onChange={(event) => setPassengerCareAction(event.target.value)}
            className="field mt-2"
            rows={2}
            placeholder="Transport, accommodation, onward travel, or passenger notification arrangements"
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="justify-self-start border border-champagne/40 px-3 py-2 whisper text-champagne disabled:opacity-40"
        >
          {saving ? "RECORDING..." : "RECORD DIVERSION"}
        </button>
      </form>
      {diversions.length > 0 && (
        <div className="mt-5 border-t border-ivory/10 pt-4">
          <p className="whisper text-ivory/45">RECORDED EVENTS</p>
          <ul className="mt-2 space-y-2">
            {diversions.map((item) => (
              <li key={item.id} className="border border-ivory/10 p-3 text-xs text-ivory/60">
                <strong className="text-champagne">
                  {item.original_destination} → {item.revised_destination}
                </strong>
                <span className="ml-2">
                  {new Date(item.diversion_time).toLocaleString()} ·{" "}
                  {item.reason.replaceAll("_", " ")} · PIC {item.pic_name}
                </span>
                <p className="mt-1">
                  ATC/FIC: {item.atc_fic_notified ? "recorded" : "not recorded"} · Dispatch:{" "}
                  {item.dispatch_notified ? "recorded" : "not recorded"} · Landing:{" "}
                  {item.landing_permission_status} · Reporting: {item.reporting_status}
                </p>
                <p className="mt-1">{item.passenger_care_action}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
