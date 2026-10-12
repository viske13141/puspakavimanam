import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { InputHTMLAttributes } from "react";
import {
  clearAircraftSelection,
  createAircraftDraft,
  createEmptyAircraftDraft,
  deleteAircraftDraft,
  listOpenAircraftDrafts,
  readAircraftSelection,
  submitAircraftDraft,
  updateAircraftDraft,
  type AircraftBookingDraftData,
  type CustomerBookingDraft,
  type FlightPassenger,
  type PassengerType,
} from "@/lib/aircraft-booking-service";

const steps = [
  "Aircraft requirements",
  "Flight itinerary",
  "Contact details",
  "Passengers",
  "Special requirements",
  "Review & submit",
];
const currencies = ["EUR", "USD", "GBP", "AED", "INR"];
const passengerTypes: PassengerType[] = ["ADULT", "CHILD", "INFANT", "UNACCOMPANIED_MINOR"];
type ProfileContact = {
  full_name: string;
  email: string;
  mobile: string | null;
  country: string | null;
  company: string | null;
};

function localDateToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function flightDate(date: string, time: string) {
  return new Date(`${date}T${time}`);
}

export function AircraftBookingFlow({
  profile,
  draftId,
  startNew = false,
}: {
  profile: ProfileContact | null;
  draftId: string | undefined;
  startNew?: boolean;
}) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [draft, setDraft] = useState<CustomerBookingDraft | null>(null);
  const [values, setValues] = useState<AircraftBookingDraftData | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [confirmation, setConfirmation] = useState<{ id: string; number: string } | null>(null);
  const newDraftPromise = useRef<Promise<CustomerBookingDraft> | null>(null);

  useEffect(() => {
    if (!user?.id || role !== "CUSTOMER") return;
    let active = true;
    void (async () => {
      try {
        const drafts = await listOpenAircraftDrafts();
        if (!active) return;
        let current: CustomerBookingDraft | undefined;
        if (startNew) {
          newDraftPromise.current ??= createEmptyAircraftDraft(user.id);
          current = await newDraftPromise.current;
        } else {
          current = draftId ? drafts.find((item) => item.id === draftId) : drafts[0];
        }
        if (!startNew && draftId && !current)
          throw new Error("That saved booking draft was not found in your account.");
        if (!startNew && !current) {
          const selection = readAircraftSelection();
          if (selection) current = await createAircraftDraft(user.id, selection);
        }
        if (!active) return;
        if (!current) {
          setError("No flight selection was found. Start again from the home page.");
          return;
        }
        const data = current.draft_data;
        if (profile) {
          data.contact = {
            ...data.contact,
            full_name: data.contact.full_name || profile.full_name || "",
            email: data.contact.email || profile.email || "",
            mobile: data.contact.mobile || profile.mobile || "",
            country: data.contact.country || profile.country || "",
            company: data.contact.company || profile.company || "",
          };
        }
        setDraft(current);
        setValues(data);
        setStep(Math.min(Math.max(current.current_step, 0), steps.length - 1));
        if (startNew && !draftId) {
          await navigate({
            to: "/customer/flight-booking",
            search: { draftId: current.id },
            replace: true,
          });
        }
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load your saved booking.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, role, profile, draftId, startNew, navigate]);

  useEffect(() => {
    if (!draft || !values || confirmation) return;
    const timer = window.setTimeout(() => {
      setSaving(true);
      void updateAircraftDraft(draft.id, values, step)
        .then(() =>
          setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
        )
        .catch((saveError: unknown) =>
          setError(saveError instanceof Error ? saveError.message : "Unable to save your draft."),
        )
        .finally(() => setSaving(false));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, values, step, confirmation]);

  function update<K extends keyof AircraftBookingDraftData>(
    key: K,
    value: AircraftBookingDraftData[K],
  ) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
    setError("");
  }

  function updateContact(key: keyof AircraftBookingDraftData["contact"], value: string) {
    setValues((current) =>
      current ? { ...current, contact: { ...current.contact, [key]: value } } : current,
    );
    setError("");
  }

  function updatePassenger(index: number, key: keyof FlightPassenger, value: string | boolean) {
    setValues((current) => {
      if (!current) return current;
      const passengers = [...current.passengers];
      const passenger = passengers[index];
      if (!passenger) return current;
      passengers[index] = { ...passenger, [key]: value };
      return { ...current, passengers };
    });
    setError("");
  }

  function resizePassengerCount(count: number) {
    setValues((current) => {
      if (!current) return current;
      const passengers = current.passengers.slice(0, count);
      while (passengers.length < count) {
        passengers.push({
          full_legal_name: "",
          date_of_birth: "",
          nationality: "",
          passenger_type: "ADULT",
          is_foreign_national: false,
          visa_required: false,
          medical_fitness_required: false,
          contact_email: "",
          contact_phone: "",
          emergency_contact_name: "",
          emergency_contact_relationship: "",
          emergency_contact_phone: "",
          next_of_kin_name: "",
          next_of_kin_relationship: "",
          next_of_kin_phone: "",
        });
      }
      return { ...current, passenger_count: count, passengers };
    });
  }

  function validateStep(currentStep: number) {
    if (!values) return "Booking details are not available.";
    if (currentStep === 0) {
      if (values.aircraft_type !== "helicopter" && values.aircraft_type !== "flight")
        return "Choose an aircraft type.";
      if (
        !Number.isInteger(values.passenger_count) ||
        values.passenger_count < 1 ||
        values.passenger_count > 50
      )
        return "Passenger count must be between 1 and 50.";
      if (!Number.isFinite(Number(values.budget)) || Number(values.budget) <= 0)
        return "Enter a positive estimated budget.";
      if (!currencies.includes(values.currency)) return "Choose a supported budget currency.";
    }
    if (currentStep === 1) {
      if (!values.departure.trim() || !values.destination.trim())
        return "Enter both departure and destination.";
      if (values.departure.trim().toLowerCase() === values.destination.trim().toLowerCase())
        return "Departure and destination must be different.";
      if (!values.departure_date || values.departure_date < localDateToday())
        return "Choose a departure date that is not in the past.";
      if (!values.departure_time) return "Enter a departure time.";
      if (flightDate(values.departure_date, values.departure_time) <= new Date())
        return "Departure date and time must be in the future.";
      if (values.trip_type === "ROUND_TRIP") {
        if (
          !values.return_date ||
          !values.return_time ||
          flightDate(values.return_date, values.return_time) <=
            flightDate(values.departure_date, values.departure_time)
        )
          return "Return date and time must be later than departure.";
      }
    }
    if (currentStep === 2) {
      const { full_name, email, mobile } = values.contact;
      if (
        !full_name.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        mobile.replace(/\D/g, "").length < 7
      )
        return "Enter your name, a valid email address and a valid mobile number.";
    }
    if (currentStep === 3) {
      if (values.passengers.length !== values.passenger_count)
        return "Passenger count and passenger details do not match.";
      const missing = values.passengers.some(
        (p) =>
          !p.full_legal_name.trim() ||
          !p.nationality.trim() ||
          !p.emergency_contact_name.trim() ||
          !p.emergency_contact_relationship.trim() ||
          p.emergency_contact_phone.replace(/\D/g, "").length < 5 ||
          !p.next_of_kin_name.trim() ||
          !p.next_of_kin_relationship.trim() ||
          p.next_of_kin_phone.replace(/\D/g, "").length < 5 ||
          (p.date_of_birth && p.date_of_birth > localDateToday()),
      );
      if (missing)
        return "Complete each passenger's legal name, nationality, emergency contact and next-of-kin details. Check dates of birth.";
    }
    return "";
  }

  async function persist(nextStep: number) {
    if (!draft || !values) return;
    setSaving(true);
    try {
      await updateAircraftDraft(draft.id, values, nextStep);
      setStep(nextStep);
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your draft.");
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function exitToDashboard() {
    if (step < 0 || !draft || !values) return;
    try {
      await persist(step);
      await navigate({ to: "/customer/dashboard" });
    } catch {
      // Keep the form open and show the persistence error.
    }
  }

  async function discard() {
    if (
      !draft ||
      !window.confirm("Discard this flight booking draft? Submitted requests are not affected.")
    )
      return;
    try {
      await deleteAircraftDraft(draft.id);
      clearAircraftSelection();
      await navigate({ to: "/customer/dashboard" });
    } catch (discardError) {
      setError(
        discardError instanceof Error ? discardError.message : "Unable to discard this draft.",
      );
    }
  }

  async function submit() {
    const problem = validateStep(0) || validateStep(1) || validateStep(2) || validateStep(3);
    if (problem) {
      setError(problem);
      const stepForError = validateStep(0) ? 0 : validateStep(1) ? 1 : validateStep(2) ? 2 : 3;
      setStep(stepForError);
      return;
    }
    if (!draft || !values) return;
    setSubmitting(true);
    setError("");
    try {
      await updateAircraftDraft(draft.id, values, 5);
      const result = await submitAircraftDraft(draft.id);
      clearAircraftSelection();
      setConfirmation({ id: result.request_id, number: result.request_number });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your flight request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <p className="py-12 text-center text-sm text-ivory/50">
        Restoring your saved flight details…
      </p>
    );
  if (confirmation) {
    return (
      <section className="border border-champagne/30 bg-champagne/5 p-8 text-center">
        <p className="whisper text-champagne">REQUEST RECEIVED · {confirmation.number}</p>
        <h2 className="mt-4 font-serif text-4xl font-light text-ivory">
          Your flight request is submitted.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-ivory/60">
          Aircraft availability and final pricing are subject to confirmation. This request is not a
          confirmed reservation.
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/customer/bookings" })}
          className="mt-7 border border-champagne/50 px-5 py-3 whisper text-champagne"
        >
          VIEW REQUEST →
        </button>
      </section>
    );
  }
  if (!values || !draft) {
    return (
      <section className="border border-white/10 p-8 text-center">
        <p role="alert" className="text-sm text-red-200">
          {error || "No flight draft is available."}
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/" })}
          className="mt-5 whisper text-champagne"
        >
          START A FLIGHT BOOKING →
        </button>
      </section>
    );
  }

  const aircraftLabel =
    values.aircraft_type === "helicopter"
      ? "Helicopter"
      : values.aircraft_type === "flight"
        ? "Private jet / aircraft"
        : "Not selected";
  const textInput = (
    label: string,
    value: string,
    onChange: (event: ChangeEvent<HTMLInputElement>) => void,
    props: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="block">
      <span className="whisper text-ivory/50">{label}</span>
      <input className="field" value={value} onChange={onChange} {...props} />
    </label>
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="mb-7 flex flex-wrap gap-2" aria-label="Booking progress">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index < step && void persist(index)}
              className={`border px-3 py-2 text-left text-xs ${index === step ? "border-champagne text-champagne" : index < step ? "border-white/20 text-ivory/65" : "border-white/10 text-ivory/30"}`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 5) void submit();
            else {
              const issue = validateStep(step);
              if (issue) setError(issue);
              else void persist(step + 1).catch(() => {});
            }
          }}
          className="space-y-6"
        >
          <header className="border-b border-white/10 pb-5">
            <p className="whisper text-champagne">
              STEP {step + 1} OF {steps.length}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-light text-ivory">{steps[step]}</h1>
          </header>
          {error && (
            <p role="alert" className="border border-red-300/30 p-3 text-sm text-red-100">
              {error}
            </p>
          )}

          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="whisper text-ivory/50">Aircraft type</span>
                <select
                  className="field"
                  value={values.aircraft_type}
                  onChange={(e) => {
                    const selected = e.target.value;
                    update(
                      "aircraft_type",
                      selected === "helicopter" || selected === "flight" ? selected : "",
                    );
                  }}
                >
                  <option value="">Choose aircraft type</option>
                  <option value="helicopter">Helicopter</option>
                  <option value="flight">Private jet / aircraft</option>
                </select>
              </label>
              {textInput(
                "Preferred aircraft / model (optional)",
                values.aircraft_preference ?? "",
                (e) => update("aircraft_preference", e.target.value),
                { placeholder: "Any suitable aircraft" },
              )}
              <label className="block">
                <span className="whisper text-ivory/50">Passengers</span>
                <input
                  className="field"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={values.passenger_count}
                  onChange={(e) => resizePassengerCount(Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className="whisper text-ivory/50">Estimated budget</span>
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <input
                    className="field"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={values.budget || ""}
                    onChange={(e) => update("budget", Number(e.target.value))}
                  />
                  <select
                    className="field"
                    value={values.currency}
                    onChange={(e) => update("currency", e.target.value)}
                  >
                    {currencies.map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {textInput(
                "Departure airport / helipad / city",
                values.departure,
                (e) => update("departure", e.target.value),
                { required: true },
              )}
              {textInput(
                "Destination airport / helipad / city",
                values.destination,
                (e) => update("destination", e.target.value),
                { required: true },
              )}
              {textInput(
                "Departure date",
                values.departure_date,
                (e) => update("departure_date", e.target.value),
                { type: "date", min: localDateToday(), required: true },
              )}
              {textInput(
                "Departure time",
                values.departure_time,
                (e) => update("departure_time", e.target.value),
                { type: "time", required: true },
              )}
              <label className="block">
                <span className="whisper text-ivory/50">Trip type</span>
                <select
                  className="field"
                  value={values.trip_type}
                  onChange={(e) => update("trip_type", e.target.value as "ONE_WAY" | "ROUND_TRIP")}
                >
                  <option value="ONE_WAY">One way</option>
                  <option value="ROUND_TRIP">Round trip</option>
                </select>
              </label>
              {values.trip_type === "ROUND_TRIP" && (
                <>
                  {textInput(
                    "Return date",
                    values.return_date,
                    (e) => update("return_date", e.target.value),
                    {
                      type: "date",
                      min: values.departure_date || localDateToday(),
                      required: true,
                    },
                  )}
                  {textInput(
                    "Return time",
                    values.return_time,
                    (e) => update("return_time", e.target.value),
                    { type: "time", required: true },
                  )}
                </>
              )}
              {textInput(
                "Timezone",
                values.departure_timezone,
                (e) => update("departure_timezone", e.target.value),
                { placeholder: "e.g. Asia/Kolkata" },
              )}
              <label className="flex items-center gap-3 text-sm text-ivory/60">
                <input
                  type="checkbox"
                  checked={values.flexible_dates}
                  onChange={(e) => update("flexible_dates", e.target.checked)}
                />{" "}
                My travel dates are flexible
              </label>
              {textInput(
                "Preferred departure window (optional)",
                values.preferred_departure_window,
                (e) => update("preferred_departure_window", e.target.value),
                { placeholder: "Morning, afternoon…" },
              )}
              {textInput(
                "Flight purpose (optional)",
                values.flight_purpose,
                (e) => update("flight_purpose", e.target.value),
                { placeholder: "Business, leisure…" },
              )}
              <label className="block sm:col-span-2">
                <span className="whisper text-ivory/50">Route notes (optional)</span>
                <textarea
                  className="field"
                  rows={3}
                  value={values.route_notes}
                  onChange={(e) => update("route_notes", e.target.value)}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {textInput(
                "Full name",
                values.contact.full_name,
                (e) => updateContact("full_name", e.target.value),
                { autoComplete: "name", required: true },
              )}
              {textInput(
                "Email",
                values.contact.email,
                (e) => updateContact("email", e.target.value),
                { type: "email", autoComplete: "email", required: true },
              )}
              {textInput(
                "Mobile",
                values.contact.mobile,
                (e) => updateContact("mobile", e.target.value),
                { type: "tel", autoComplete: "tel", required: true },
              )}
              {textInput(
                "Country",
                values.contact.country,
                (e) => updateContact("country", e.target.value),
                { autoComplete: "country-name" },
              )}
              {textInput(
                "Company (optional)",
                values.contact.company,
                (e) => updateContact("company", e.target.value),
                { autoComplete: "organization" },
              )}
              <label className="block">
                <span className="whisper text-ivory/50">Preferred contact method</span>
                <select
                  className="field"
                  value={values.contact.preferred_contact_method}
                  onChange={(e) => updateContact("preferred_contact_method", e.target.value)}
                >
                  <option value="">No preference</option>
                  <option>Email</option>
                  <option>Phone</option>
                  <option>WhatsApp</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="whisper text-ivory/50">Contact notes (optional)</span>
                <textarea
                  className="field"
                  rows={3}
                  value={values.contact.contact_notes}
                  onChange={(e) => updateContact("contact_notes", e.target.value)}
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {values.passengers.map((passenger, index) => (
                <fieldset
                  key={index}
                  className="grid gap-4 border border-white/10 p-4 sm:grid-cols-2"
                >
                  <legend className="px-2 font-serif text-xl text-ivory">
                    Passenger {index + 1}
                  </legend>
                  {textInput(
                    "Full legal name",
                    passenger.full_legal_name,
                    (e) => updatePassenger(index, "full_legal_name", e.target.value),
                    { autoComplete: "name" },
                  )}
                  {textInput("Nationality", passenger.nationality, (e) =>
                    updatePassenger(index, "nationality", e.target.value),
                  )}
                  <label className="block">
                    <span className="whisper text-ivory/50">Passenger type</span>
                    <select
                      className="field"
                      value={passenger.passenger_type}
                      onChange={(e) =>
                        updatePassenger(index, "passenger_type", e.target.value as PassengerType)
                      }
                    >
                      {passengerTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  {textInput(
                    "Date of birth (optional)",
                    passenger.date_of_birth,
                    (e) => updatePassenger(index, "date_of_birth", e.target.value),
                    { type: "date", max: localDateToday() },
                  )}
                  {textInput("Emergency contact name", passenger.emergency_contact_name, (e) =>
                    updatePassenger(index, "emergency_contact_name", e.target.value),
                  )}
                  {textInput(
                    "Emergency contact relationship",
                    passenger.emergency_contact_relationship,
                    (e) => updatePassenger(index, "emergency_contact_relationship", e.target.value),
                  )}
                  {textInput(
                    "Emergency contact phone",
                    passenger.emergency_contact_phone,
                    (e) => updatePassenger(index, "emergency_contact_phone", e.target.value),
                    { type: "tel" },
                  )}
                  {textInput("Next-of-kin name", passenger.next_of_kin_name, (e) =>
                    updatePassenger(index, "next_of_kin_name", e.target.value),
                  )}
                  {textInput("Next-of-kin relationship", passenger.next_of_kin_relationship, (e) =>
                    updatePassenger(index, "next_of_kin_relationship", e.target.value),
                  )}
                  {textInput(
                    "Next-of-kin phone",
                    passenger.next_of_kin_phone,
                    (e) => updatePassenger(index, "next_of_kin_phone", e.target.value),
                    { type: "tel" },
                  )}
                  {textInput(
                    "Passenger email (optional)",
                    passenger.contact_email,
                    (e) => updatePassenger(index, "contact_email", e.target.value),
                    { type: "email" },
                  )}
                  {textInput(
                    "Passenger phone (optional)",
                    passenger.contact_phone,
                    (e) => updatePassenger(index, "contact_phone", e.target.value),
                    { type: "tel" },
                  )}
                  <label className="flex items-center gap-2 text-xs text-ivory/60">
                    <input
                      type="checkbox"
                      checked={passenger.is_foreign_national}
                      onChange={(e) =>
                        updatePassenger(index, "is_foreign_national", e.target.checked)
                      }
                    />{" "}
                    Foreign national
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ivory/60">
                    <input
                      type="checkbox"
                      checked={passenger.visa_required}
                      onChange={(e) => updatePassenger(index, "visa_required", e.target.checked)}
                    />{" "}
                    Visa required
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ivory/60">
                    <input
                      type="checkbox"
                      checked={passenger.medical_fitness_required}
                      onChange={(e) =>
                        updatePassenger(index, "medical_fitness_required", e.target.checked)
                      }
                    />{" "}
                    Medical fitness certificate required
                  </label>
                </fieldset>
              ))}
              <p className="text-xs text-ivory/40">
                Identity documents can be provided later through the existing passenger compliance
                workflow.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="whisper text-ivory/50">Additional requirements</span>
                <textarea
                  className="field"
                  rows={3}
                  value={values.additional_requirements}
                  onChange={(e) => update("additional_requirements", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="whisper text-ivory/50">Special assistance (optional)</span>
                <textarea
                  className="field"
                  rows={3}
                  value={values.special_assistance}
                  onChange={(e) => update("special_assistance", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="whisper text-ivory/50">Accessibility requirements (optional)</span>
                <textarea
                  className="field"
                  rows={3}
                  value={values.accessibility_requirements}
                  onChange={(e) => update("accessibility_requirements", e.target.value)}
                />
              </label>
              <label className="flex items-center gap-3 text-sm text-ivory/60">
                <input
                  type="checkbox"
                  checked={values.medical_assistance_required}
                  onChange={(e) => update("medical_assistance_required", e.target.checked)}
                />{" "}
                Medical assistance required
              </label>
              <label className="block sm:col-span-2">
                <span className="whisper text-ivory/50">Baggage notes (optional)</span>
                <textarea
                  className="field"
                  rows={3}
                  value={values.baggage_notes}
                  onChange={(e) => update("baggage_notes", e.target.value)}
                />
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 text-sm text-ivory/70">
              <section className="border border-white/10 p-5">
                <h2 className="font-serif text-xl text-ivory">Aircraft & itinerary</h2>
                <p className="mt-3">
                  {aircraftLabel} · {values.passenger_count} passenger(s) · {values.currency}{" "}
                  {Number(values.budget).toLocaleString()}
                </p>
                <p className="mt-2">
                  {values.departure} → {values.destination} · {values.departure_date}{" "}
                  {values.departure_time} ({values.departure_timezone})
                </p>
                <p className="mt-2">
                  {values.trip_type === "ROUND_TRIP"
                    ? `Return ${values.return_date} ${values.return_time} (${values.return_timezone})`
                    : "One way"}{" "}
                  · Preferred model: {values.aircraft_preference || "No preference"}
                </p>
              </section>
              <section className="border border-white/10 p-5">
                <h2 className="font-serif text-xl text-ivory">Customer</h2>
                <p className="mt-3">
                  {values.contact.full_name} · {values.contact.email} · {values.contact.mobile}
                </p>
              </section>
              <section className="border border-white/10 p-5">
                <h2 className="font-serif text-xl text-ivory">Passengers</h2>
                <ul className="mt-3 space-y-2">
                  {values.passengers.map((passenger, index) => (
                    <li key={index}>
                      {passenger.full_legal_name} · {passenger.passenger_type} ·{" "}
                      {passenger.nationality}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="border border-white/10 p-5">
                <h2 className="font-serif text-xl text-ivory">Flight requirements</h2>
                <p className="mt-3 whitespace-pre-wrap">
                  {[
                    values.additional_requirements,
                    values.special_assistance,
                    values.accessibility_requirements,
                    values.baggage_notes,
                  ]
                    .filter(Boolean)
                    .join("\n") || "No additional requirements"}
                </p>
              </section>
              <p className="border border-champagne/20 bg-champagne/5 p-4 text-xs leading-5 text-ivory/60">
                This is a charter booking request, not a confirmed reservation. Aircraft
                availability is subject to confirmation and pricing may change after review.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => (step ? void persist(step - 1) : void exitToDashboard())}
              className="border border-white/15 px-4 py-3 whisper text-ivory/60"
            >
              {step ? "← BACK" : "SAVE & EXIT"}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void exitToDashboard()}
                className="px-4 py-3 whisper text-ivory/50"
              >
                SAVE & EXIT
              </button>
              {step < steps.length - 1 ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="border border-champagne/50 px-5 py-3 whisper text-champagne disabled:opacity-40"
                >
                  {saving ? "SAVING…" : "CONTINUE →"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="border border-champagne/50 px-5 py-3 whisper text-champagne disabled:opacity-40"
                >
                  {submitting ? "SUBMITTING…" : "SUBMIT FLIGHT BOOKING REQUEST"}
                </button>
              )}
            </div>
          </div>
          <p className="text-right text-xs text-ivory/35" aria-live="polite">
            {saving
              ? "Saving securely…"
              : savedAt
                ? `Saved ${savedAt}`
                : "Draft is saved securely to your account"}
          </p>
          <button
            type="button"
            onClick={() => void discard()}
            className="text-xs text-red-200/60 underline"
          >
            Discard draft
          </button>
        </form>
      </div>
      <aside className="h-fit border border-champagne/20 bg-champagne/[0.04] p-5 xl:sticky xl:top-8">
        <p className="whisper text-champagne">FLIGHT SUMMARY</p>
        <p className="mt-4 font-serif text-2xl text-ivory">{aircraftLabel}</p>
        <p className="mt-2 text-sm text-ivory/55">{values.passenger_count} passenger(s)</p>
        <p className="mt-4 text-sm text-ivory/70">
          {values.currency} {Number(values.budget).toLocaleString()}
        </p>
        <p className="mt-4 border-t border-white/10 pt-4 text-xs text-ivory/40">
          Availability is confirmed only by the Viman team.
        </p>
      </aside>
    </div>
  );
}
