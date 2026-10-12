import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plane,
  Plus,
  Search,
  X,
} from "lucide-react";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { customerNav } from "@/lib/portal-nav";
import { scenes } from "@/content/site";
import { createRequest } from "@/lib/request-service";
import {
  deleteCustomerEventDraft,
  listCustomerEventDrafts,
  saveCustomerEventDraft,
  type CustomerEventDraft,
  type EventRequestValues,
} from "@/lib/event-request-service";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/customer/events")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") await requireRoleAccess(["CUSTOMER"]);
  },
  component: CustomerEvents,
});

type EventSubtype = "SPECIAL" | "EMERGENCY";
type EventRequestRecord = {
  id: string;
  request_number: string;
  service_type: string;
  service_subtype: string | null;
  status: string;
  people_count: number;
  budget: number | null;
  currency: string;
  departure: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  additional_requirements: string | null;
  service_details: {
    event?: {
      name?: string;
      experience_name?: string;
      purpose?: string;
      city?: string;
      venue?: string;
      venue_address?: string;
      event_date?: string;
      total_attendees?: number | string;
    };
    aviation?: {
      service_type?: string;
      preferred_aircraft?: string;
      special_requirements?: string;
    };
    preferences?: {
      catering_required?: boolean;
      beverage_service_required?: boolean;
      decoration_required?: boolean;
      photography_required?: boolean;
    };
    contact?: { preferred_contact_method?: string };
  } | null;
};

const experiences: {
  subtype: EventSubtype;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}[] = [
  {
    subtype: "SPECIAL",
    title: "Special event aviation",
    description:
      "Plan an aviation-led occasion with your preferred timing, passenger needs and personal touches. All arrangements remain subject to review.",
    image: scenes.aviation,
    imageAlt: "Private aircraft prepared for a flight",
  },
  {
    subtype: "EMERGENCY",
    title: "Urgent aviation request",
    description:
      "Share an urgent flight requirement with the aviation desk. Submission is not an emergency response service or confirmation of aircraft availability.",
    image: scenes.aviation,
    imageAlt: "A private aircraft prepared for a flight",
  },
];

const steps = [
  "Event selection",
  "Event details",
  "Aviation",
  "Preferences",
  "Contact",
  "Review",
] as const;

function CustomerEvents() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<EventRequestRecord[]>([]);
  const [drafts, setDrafts] = useState<CustomerEventDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [requestPage, setRequestPage] = useState(1);
  const [activeForm, setActiveForm] = useState(false);
  const [selectedSubtype, setSelectedSubtype] = useState<EventSubtype>("SPECIAL");
  const [detailSubtype, setDetailSubtype] = useState<EventSubtype | null>(null);
  const [editingDraft, setEditingDraft] = useState<CustomerEventDraft | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EventRequestRecord | null>(null);
  const [draftError, setDraftError] = useState("");
  const [successRequest, setSuccessRequest] = useState<EventRequestRecord | null>(null);
  const pageSize = 8;

  const reloadCustomerData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError("");
    try {
      const [{ data: requestData, error: requestError }, eventDrafts] = await Promise.all([
        supabase
          .from("requests")
          .select("*")
          .eq("customer_id", user.id)
          .eq("service_type", "EVENT_AVIATION")
          .order("created_at", { ascending: false }),
        listCustomerEventDrafts(),
      ]);
      if (requestError) throw requestError;
      setRequests((requestData ?? []) as EventRequestRecord[]);
      setDrafts(eventDrafts);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load your event requests.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void reloadCustomerData();
  }, [reloadCustomerData]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests
      .filter((request) => statusFilter === "ALL" || request.status === statusFilter)
      .filter((request) => {
        const eventName =
          stringValue(request.service_details?.event?.name) ||
          stringValue(request.service_details?.event?.experience_name);
        const purpose = stringValue(request.service_details?.event?.purpose);
        const location = stringValue(request.service_details?.event?.city);
        return (
          !query ||
          [request.request_number, request.service_subtype ?? "", eventName, purpose, location]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );
      })
      .sort((left, right) => {
        const delta = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        return sortOrder === "newest" ? -delta : delta;
      });
  }, [requests, search, statusFilter, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const visibleRequests = filteredRequests.slice(
    (requestPage - 1) * pageSize,
    requestPage * pageSize,
  );

  useEffect(() => {
    if (requestPage > pageCount) setRequestPage(pageCount);
  }, [requestPage, pageCount]);

  useEffect(() => {
    if (requestPage > pageCount) setRequestPage(pageCount);
  }, [requestPage, pageCount]);

  function beginRequest(subtype: EventSubtype) {
    setSelectedSubtype(subtype);
    setEditingDraft(null);
    setDetailSubtype(null);
    setSuccessRequest(null);
    setActiveForm(true);
    setTimeout(
      () => document.getElementById("event-request-form")?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  }

  function continueDraft(draft: CustomerEventDraft) {
    setSelectedSubtype(draft.form.subtype);
    setEditingDraft(draft);
    setActiveForm(true);
    setDraftError("");
    setTimeout(
      () => document.getElementById("event-request-form")?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  }

  async function discardDraft(draft: CustomerEventDraft) {
    if (!window.confirm("Discard this saved event request? This cannot be undone.")) return;
    setDraftError("");
    try {
      await deleteCustomerEventDraft(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
    } catch (error) {
      setDraftError(
        error instanceof Error ? error.message : "Unable to discard this event request.",
      );
    }
  }

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <PortalShell
      title="Events & Experiences"
      nav={customerNav}
      onLogout={() => void handleLogout()}
      headerAction={
        <div className="flex flex-wrap gap-2">
          <a
            href="#experiences"
            className="inline-flex min-h-11 items-center gap-2 border border-champagne/50 px-5 py-3 text-xs tracking-[0.16em] text-champagne transition-colors hover:bg-champagne/10"
          >
            EXPLORE EXPERIENCES <ArrowRight size={15} />
          </a>
          <a
            href="#my-event-requests"
            className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-5 py-3 text-xs tracking-[0.16em] text-ivory/70 transition-colors hover:border-champagne hover:text-champagne"
          >
            MY EVENT REQUESTS <ArrowRight size={15} />
          </a>
        </div>
      }
    >
      <div className="space-y-14">
        <section
          className="relative isolate flex min-h-[360px] items-end overflow-hidden border border-white/10 bg-cover bg-center p-7 sm:p-10"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(8,12,18,.94), rgba(8,12,18,.3)), url("${scenes.aviation}")`,
          }}
        >
          <div className="absolute inset-0 -z-10 bg-obsidian/25" />
          <div className="max-w-2xl">
            <p className="whisper text-champagne">AVIATION, COMPOSED AROUND YOUR OCCASION</p>
            <h2 className="mt-4 font-serif text-4xl font-light leading-tight text-ivory sm:text-5xl">
              Create extraordinary moments with exclusive aviation experiences.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ivory/65">
              Tell our team what you have in mind. Every flight, service, permission and quotation
              is reviewed before it can be confirmed.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#experiences"
                className="inline-flex items-center gap-2 bg-champagne px-5 py-3 text-xs tracking-[0.14em] text-obsidian hover:bg-ivory"
              >
                EXPLORE EXPERIENCES <ArrowRight size={15} />
              </a>
              <button
                type="button"
                onClick={() => beginRequest("SPECIAL")}
                className="inline-flex items-center gap-2 border border-ivory/40 px-5 py-3 text-xs tracking-[0.14em] text-ivory hover:border-champagne hover:text-champagne"
              >
                REQUEST A CUSTOM EXPERIENCE <Plus size={15} />
              </button>
            </div>
          </div>
        </section>

        <section id="experiences" className="scroll-mt-8">
          <SectionHeading
            eyebrow="A PRIVATE AVIATION DESK"
            title="Events & experiences"
            description="Begin with the kind of aviation request already supported by your account. Selecting an experience opens a request for review, not a confirmed booking."
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {experiences.map((experience) => (
              <article
                key={experience.subtype}
                className="group overflow-hidden border border-white/10 bg-white/[0.025]"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={experience.image}
                    alt={experience.imageAlt}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-4 top-4 border border-white/25 bg-obsidian/75 px-3 py-1 whisper text-champagne">
                    {experience.subtype === "SPECIAL" ? "SPECIAL EVENT" : "EXISTING URGENT REQUEST"}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-2xl text-ivory">{experience.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ivory/55">{experience.description}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setDetailSubtype(experience.subtype)}
                      className="border border-ivory/20 px-4 py-2.5 text-xs tracking-[0.12em] text-ivory/80 hover:border-champagne hover:text-champagne"
                    >
                      VIEW DETAILS
                    </button>
                    <button
                      type="button"
                      onClick={() => beginRequest(experience.subtype)}
                      className="inline-flex items-center gap-2 border border-champagne/50 px-4 py-2.5 text-xs tracking-[0.12em] text-champagne hover:bg-champagne/10"
                    >
                      REQUEST EXPERIENCE <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {detailSubtype && !activeForm && (
            <ExperienceDetails
              subtype={detailSubtype}
              onClose={() => setDetailSubtype(null)}
              onRequest={() => beginRequest(detailSubtype)}
            />
          )}
        </section>

        {draftError && (
          <p role="alert" className="border border-red-300/30 p-4 text-sm text-red-100">
            {draftError}
          </p>
        )}

        {!!drafts.length && (
          <section aria-labelledby="saved-event-requests">
            <SectionHeading
              eyebrow="PRIVATE SAVED DRAFTS"
              title="Continue your event request"
              description="Your event drafts are separate from aircraft booking drafts and can only be accessed by your account."
            />
            <div className="mt-5 space-y-3">
              {drafts.map((draft) => (
                <article
                  key={draft.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-white/[0.02] p-5"
                >
                  <div>
                    <h3 className="font-serif text-xl text-ivory">
                      {draft.form.eventName.trim() || "Untitled event request"}
                    </h3>
                    <p className="mt-1 text-xs text-ivory/45">
                      {draft.form.subtype === "EMERGENCY"
                        ? "Urgent aviation request"
                        : "Special event aviation"}
                      {" · "}
                      {new Date(draft.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => continueDraft(draft)}
                      className="border border-champagne/50 px-4 py-2.5 text-xs text-champagne hover:bg-champagne/10"
                    >
                      CONTINUE
                    </button>
                    <button
                      type="button"
                      onClick={() => void discardDraft(draft)}
                      className="border border-white/15 px-4 py-2.5 text-xs text-ivory/60 hover:border-red-300/50 hover:text-red-100"
                    >
                      DISCARD
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeForm && (
          <EventRequestWizard
            key={selectedSubtype}
            subtype={selectedSubtype}
            profile={profile}
            userEmail={user?.email ?? ""}
            draft={editingDraft}
            onClose={() => setActiveForm(false)}
            onSaved={async (draft) => {
              setDrafts((current) => {
                const withoutSaved = current.filter((item) => item.id !== draft.id);
                return [draft, ...withoutSaved];
              });
              setDraftError("");
              setEditingDraft(null);
              setActiveForm(false);
            }}
            onSubmitted={async (record, draftId) => {
              if (draftId) {
                try {
                  await deleteCustomerEventDraft(draftId);
                  setDrafts((current) => current.filter((item) => item.id !== draftId));
                } catch (error) {
                  setDraftError(
                    error instanceof Error
                      ? `Your request was submitted, but its saved draft could not be removed: ${error.message}`
                      : "Your request was submitted, but its saved draft could not be removed.",
                  );
                }
              }
              setActiveForm(false);
              setSuccessRequest(record as EventRequestRecord);
              await reloadCustomerData();
              document.getElementById("my-event-requests")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}

        <section id="my-event-requests" className="scroll-mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="YOUR AVIATION ENQUIRIES"
              title="My Event Requests"
              description="Submitted event and experience enquiries are listed here with their current status."
            />
            <a
              href="#experiences"
              className="mb-1 inline-flex items-center gap-2 text-xs tracking-[0.12em] text-champagne hover:text-ivory"
            >
              REQUEST AN EXPERIENCE <ArrowRight size={14} />
            </a>
          </div>

          {successRequest && (
            <div
              role="status"
              className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-green-300/30 bg-green-300/[0.05] p-5"
            >
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 text-green-200" size={18} />
                <div>
                  <p className="text-sm text-ivory">Event request submitted successfully.</p>
                  <p className="mt-1 text-xs text-ivory/55">
                    Reference {successRequest.request_number} · Awaiting availability and quotation
                    review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(successRequest)}
                className="text-xs tracking-[0.12em] text-champagne hover:text-ivory"
              >
                VIEW DETAILS
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <label className="relative min-w-[220px] flex-1">
              <span className="sr-only">Search event requests</span>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/40"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setRequestPage(1);
                }}
                className="field pl-9"
                placeholder="Search reference, experience or location"
              />
            </label>
            <select
              aria-label="Filter event requests by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setRequestPage(1);
              }}
              className="field min-w-44"
            >
              <option value="ALL">All statuses</option>
              {Array.from(new Set(requests.map((request) => request.status)))
                .sort()
                .map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
            </select>
            <select
              aria-label="Sort event requests"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}
              className="field min-w-36"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {loading && (
            <p className="mt-5 border border-white/10 p-8 text-center text-sm text-ivory/55">
              Loading your event requests…
            </p>
          )}
          {loadError && (
            <div role="alert" className="mt-5 border border-red-300/30 p-5 text-sm text-red-100">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void reloadCustomerData()}
                className="mt-3 underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !loadError && !visibleRequests.length && (
            <div className="mt-5 border border-dashed border-white/15 p-10 text-center">
              <CalendarDays className="mx-auto text-champagne/70" size={24} />
              <h3 className="mt-4 font-serif text-2xl text-ivory">
                {requests.length ? "No matching event requests" : "Your next occasion starts here"}
              </h3>
              <p className="mt-2 text-sm text-ivory/50">
                {requests.length
                  ? "Adjust your search or status filter."
                  : "Start an aviation event request and track its progress here."}
              </p>
              {!requests.length && (
                <a
                  href="#experiences"
                  className="mt-5 inline-block border border-champagne/50 px-4 py-2.5 text-xs tracking-[0.12em] text-champagne"
                >
                  EXPLORE EXPERIENCES
                </a>
              )}
            </div>
          )}
          {!loading && !loadError && !!visibleRequests.length && (
            <>
              <div className="mt-5 space-y-3">
                {visibleRequests.map((request) => (
                  <EventRequestCard
                    key={request.id}
                    request={request}
                    onView={() => setSelectedRequest(request)}
                  />
                ))}
              </div>
              {pageCount > 1 && (
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <p className="text-xs text-ivory/45">
                    Page {requestPage} of {pageCount}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={requestPage <= 1}
                      onClick={() => setRequestPage((page) => page - 1)}
                      className="border border-white/15 p-2 text-ivory disabled:opacity-30"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={requestPage >= pageCount}
                      onClick={() => setRequestPage((page) => page + 1)}
                      className="border border-white/15 p-2 text-ivory disabled:opacity-30"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {selectedRequest && (
        <RequestDetailsDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </PortalShell>
  );
}

function EventRequestWizard({
  subtype,
  profile,
  userEmail,
  draft,
  onClose,
  onSaved,
  onSubmitted,
}: {
  subtype: EventSubtype;
  profile: ReturnType<typeof useAuth>["profile"];
  userEmail: string;
  draft: CustomerEventDraft | null;
  onClose: () => void;
  onSaved: (draft: CustomerEventDraft) => Promise<void>;
  onSubmitted: (request: Record<string, unknown>, draftId?: string) => Promise<void>;
}) {
  const [values, setValues] = useState<EventRequestValues>(
    () =>
      draft?.form ?? {
        ...emptyEventRequestValues(subtype),
        contactName: profile?.full_name ?? "",
        contactEmail: profile?.email || userEmail,
        contactMobile: profile?.mobile ?? "",
        country: profile?.country ?? "",
        company: profile?.company ?? "",
      },
  );
  const [step, setStep] = useState(draft?.step ?? 0);
  const [draftId, setDraftId] = useState<string | undefined>(draft?.id);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const [error, setError] = useState("");

  function update<K extends keyof EventRequestValues>(field: K, value: EventRequestValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function validateStep(stepToValidate: number) {
    if (stepToValidate === 0) {
      if (!values.experienceName.trim()) return "Enter the experience name.";
      if (values.purpose === "Other" && !values.customExperience.trim()) {
        return "Describe the custom experience.";
      }
    }
    if (stepToValidate === 1) {
      if (!values.eventName.trim()) return "Enter the event name or occasion.";
      const dateConfirmed =
        values.timing === "SCHEDULED" && values.dateFlexibility !== "TO_BE_CONFIRMED";
      if (dateConfirmed) {
        if (!values.eventDate) return "Choose the event date.";
        if (values.eventDate < localDateString()) return "The event date cannot be in the past.";
        if (!values.eventStartTime) return "Choose the event start time.";
        if (values.eventEndDate && values.eventEndDate < localDateString()) {
          return "The event end date cannot be in the past.";
        }
        if (values.eventEndDate && values.eventEndDate < values.eventDate) {
          return "The event end date cannot be before its start date.";
        }
        if (
          values.eventEndTime &&
          (!values.eventEndDate || values.eventEndDate === values.eventDate) &&
          values.eventEndTime <= values.eventStartTime
        ) {
          return "The event end time must be after its start time.";
        }
      } else if (values.eventDate && values.eventDate < localDateString()) {
        return "The event date cannot be in the past.";
      }
      if (!values.eventCity.trim()) return "Enter the event city or departure area.";
      if (!Number.isInteger(values.totalAttendees) || values.totalAttendees < 1) {
        return "Enter at least one event attendee.";
      }
      if (values.budget && (!Number.isFinite(Number(values.budget)) || Number(values.budget) < 0)) {
        return "Budget cannot be negative.";
      }
    }
    if (stepToValidate === 2) {
      const dateConfirmed =
        values.timing === "SCHEDULED" && values.dateFlexibility !== "TO_BE_CONFIRMED";
      if (!Number.isInteger(values.passengerCount) || values.passengerCount < 1) {
        return "Enter at least one aircraft passenger.";
      }
      if (!values.departure.trim()) return "Enter the flight departure or pickup location.";
      if (values.tripType === "ROUND_TRIP") {
        if (!values.destination.trim()) return "Enter the destination for a round trip.";
        if (!values.returnDate || !values.returnTime)
          return "Enter the planned return date and time.";
        if (values.eventDate && values.returnDate < values.eventDate) {
          return "The return date cannot be before the event date.";
        }
      }
      if (dateConfirmed && (!values.departureDate || !values.departureTime)) {
        return "Enter the preferred flight date and time.";
      }
      if (values.departureDate && values.departureDate < localDateString()) {
        return "The preferred flight date cannot be in the past.";
      }
    }
    if (stepToValidate === 4) {
      if (!values.contactName.trim()) return "Enter the customer contact name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) {
        return "Enter a valid customer email address.";
      }
      if (!values.contactMobile.trim()) return "Enter the customer mobile number.";
    }
    return "";
  }

  async function saveDraft() {
    setSaving(true);
    setError("");
    try {
      const draft = await saveCustomerEventDraft({
        ...(draftId ? { id: draftId } : {}),
        form: values,
        step,
      });
      setDraftId(draft.id);
      await onSaved(draft);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save your event request.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.acknowledged) {
      setError("Please acknowledge the request and operational terms before submitting.");
      return;
    }
    for (let index = 0; index < steps.length - 1; index += 1) {
      const validationError = validateStep(index);
      if (validationError) {
        setStep(index);
        setError(validationError);
        return;
      }
    }
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    setError("");
    try {
      const eventDate = values.eventDate || values.departureDate;
      const additionalRequirements = [
        values.eventNotes.trim(),
        values.aviationNotes.trim(),
        values.preferenceNotes.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");
      const eventPayload = {
        event: {
          category: "EVENT_AVIATION",
          experience_type: values.subtype,
          experience_name: values.experienceName.trim(),
          name: values.eventName.trim() || values.experienceName.trim(),
          purpose: values.purpose,
          custom_experience: values.customExperience.trim() || null,
          event_date: values.eventDate || null,
          start_time: values.eventStartTime || null,
          end_date: values.eventEndDate || null,
          end_time: values.eventEndTime || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          city: values.eventCity.trim(),
          venue: values.venue.trim() || null,
          venue_address: values.venueAddress.trim() || null,
          total_attendees: values.totalAttendees,
          date_flexibility: values.dateFlexibility,
          date_notes: values.eventNotes.trim() || null,
        },
        aviation: {
          service_type: values.aircraftKind,
          preferred_aircraft: values.preferredAircraft.trim() || null,
          passenger_count: values.passengerCount,
          departure_location: values.departure.trim(),
          destination_location: values.destination.trim() || null,
          departure_date: values.departureDate || null,
          departure_time: values.departureTime || null,
          trip_type: values.tripType,
          return_date: values.returnDate || null,
          return_time: values.returnTime || null,
          ground_arrangements: {
            ground_pickup: values.groundPickup,
            vehicle_transfer: values.vehicleTransfer,
            vip_reception: values.vipReception,
            baggage_coordination: values.baggageCoordination,
            accessibility_assistance: values.accessibilityAssistance,
          },
          special_requirements: values.aviationNotes.trim() || null,
        },
        preferences: {
          catering_required: values.cateringRequired,
          dietary_preferences: splitPreferences(values.dietaryPreferences),
          meal_preferences: values.mealPreferences.trim() || null,
          catering_notes: values.cateringNotes.trim() || null,
          beverage_service_required: values.beverageRequired,
          beverage_preferences: splitPreferences(values.beveragePreferences),
          champagne_preference: values.champagneRequested ? true : null,
          decoration_required: values.decorationRequired,
          occasion_theme: values.decorationTheme.trim() || null,
          decoration_notes: values.decorationNotes.trim() || null,
          photography_required: values.photographyRequired,
          photography_notes: values.photographyNotes.trim() || null,
          vip_requirements: splitPreferences(values.vipRequirements),
          privacy_requirements: values.privacyRequirements.trim() || null,
          special_assistance: values.specialAssistance.trim() || null,
          additional_notes: values.preferenceNotes.trim() || null,
        },
        contact: {
          coordinator_name: values.coordinatorName.trim() || null,
          alternate_phone: values.alternatePhone.trim() || null,
          preferred_contact_method: values.preferredContactMethod,
          contact_notes: values.contactNotes.trim() || null,
        },
      };
      const request = await createRequest({
        serviceType: "EVENT_AVIATION",
        serviceSubtype: values.subtype,
        peopleCount: values.passengerCount,
        ...(values.budget.trim() !== "" ? { budget: Number(values.budget) } : {}),
        currency: values.currency,
        departure: values.departure.trim(),
        ...(values.destination.trim() ? { destination: values.destination.trim() } : {}),
        ...(eventDate ? { startDate: eventDate } : {}),
        ...(values.eventEndDate ? { endDate: values.eventEndDate } : {}),
        tripType: values.tripType,
        ...(additionalRequirements ? { additionalRequirements } : {}),
        customerDetails: {
          name: values.contactName.trim(),
          email: values.contactEmail.trim(),
          mobile: values.contactMobile.trim(),
          country: values.country.trim() || null,
          company: values.company.trim() || null,
          coordinator_name: values.coordinatorName.trim() || null,
          alternate_phone: values.alternatePhone.trim() || null,
          preferred_contact_method: values.preferredContactMethod,
        },
        serviceDetails: eventPayload,
      });
      await onSubmitted(request as unknown as EventRequestRecord, draftId);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to submit your event request.",
      );
      submissionLock.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  const changeText =
    (field: keyof EventRequestValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      update(field, event.target.value as never);
  const changeNumber =
    (field: "totalAttendees" | "passengerCount") => (event: React.ChangeEvent<HTMLInputElement>) =>
      update(field, Number(event.target.value) as never);
  const check = (field: keyof EventRequestValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    update(field, event.target.checked as never);
  return (
    <section
      id="event-request-form"
      className="scroll-mt-8 border border-champagne/25 bg-white/[0.02] p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="whisper text-champagne">EVENT AVIATION REQUEST</p>
          <h2 className="mt-2 font-serif text-3xl text-ivory">
            {subtype === "EMERGENCY" ? "Urgent aviation request" : "Compose your experience"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ivory/50">
            Your request is an enquiry. Availability, permissions, operational feasibility and
            pricing require confirmation.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close event request form"
          className="border border-white/15 p-2 text-ivory/55 hover:text-ivory"
        >
          <X size={17} />
        </button>
      </div>

      <ol aria-label="Request progress" className="mt-7 grid grid-cols-3 gap-2 md:grid-cols-6">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={`border px-2 py-3 text-center ${step === index ? "border-champagne/60 bg-champagne/[0.08] text-champagne" : step > index ? "border-green-200/30 text-green-100/70" : "border-white/10 text-ivory/35"}`}
          >
            <span className="block text-[0.6rem] tracking-[0.12em]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-[0.63rem]">{label}</span>
          </li>
        ))}
      </ol>

      {error && (
        <p
          role="alert"
          className="mt-5 border border-red-300/30 bg-red-300/[0.04] p-3 text-sm text-red-100"
        >
          {error}
        </p>
      )}

      <form noValidate onSubmit={submitRequest} className="mt-7">
        {step === 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Existing request category">
              <select value={values.subtype} onChange={changeText("subtype")} className="field">
                <option value="SPECIAL">Special event aviation</option>
                <option value="EMERGENCY">Urgent aviation request</option>
              </select>
            </FormField>
            <FormField label="Event purpose">
              <select value={values.purpose} onChange={changeText("purpose")} className="field">
                {[
                  "Anniversary",
                  "Birthday",
                  "Wedding",
                  "Corporate occasion",
                  "VIP transportation",
                  "Sightseeing",
                  "Other",
                ].map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {purpose}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Experience or occasion name">
              <input
                value={values.experienceName}
                onChange={changeText("experienceName")}
                className="field"
                placeholder="e.g. anniversary arrival"
              />
            </FormField>
            {values.purpose === "Other" && (
              <FormField label="Describe the custom experience">
                <input
                  value={values.customExperience}
                  onChange={changeText("customExperience")}
                  className="field"
                />
              </FormField>
            )}
            <p className="md:col-span-2 text-xs leading-5 text-ivory/40">
              These describe your request; they do not imply a published package, guaranteed service
              or confirmed availability.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Request timing">
              <select value={values.timing} onChange={changeText("timing")} className="field">
                <option value="SCHEDULED">Scheduled</option>
                {subtype === "EMERGENCY" && <option value="IMMEDIATE">Urgent / immediate</option>}
              </select>
            </FormField>
            <FormField label="Event name / occasion">
              <input
                value={values.eventName}
                onChange={changeText("eventName")}
                className="field"
                placeholder="Give this occasion a name"
              />
            </FormField>
            {values.timing === "SCHEDULED" && (
              <>
                <FormField label="Event date">
                  <input
                    type="date"
                    min={localDateString()}
                    value={values.eventDate}
                    onChange={changeText("eventDate")}
                    className="field"
                  />
                </FormField>
                <FormField label="Event start time">
                  <input
                    type="time"
                    value={values.eventStartTime}
                    onChange={changeText("eventStartTime")}
                    className="field"
                  />
                </FormField>
                <FormField label="Event end date (optional)">
                  <input
                    type="date"
                    min={values.eventDate || localDateString()}
                    value={values.eventEndDate}
                    onChange={changeText("eventEndDate")}
                    className="field"
                  />
                </FormField>
                <FormField label="Event end time (optional)">
                  <input
                    type="time"
                    value={values.eventEndTime}
                    onChange={changeText("eventEndTime")}
                    className="field"
                  />
                </FormField>
              </>
            )}
            <FormField label="City / event area">
              <input
                value={values.eventCity}
                onChange={changeText("eventCity")}
                className="field"
                placeholder="City or departure area"
              />
            </FormField>
            <FormField label="Venue / meeting point (optional)">
              <input value={values.venue} onChange={changeText("venue")} className="field" />
            </FormField>
            <FormField label="Venue address (optional)">
              <input
                value={values.venueAddress}
                onChange={changeText("venueAddress")}
                className="field"
              />
            </FormField>
            <FormField label="Total event attendees">
              <input
                type="number"
                min={1}
                step={1}
                value={values.totalAttendees || ""}
                onChange={changeNumber("totalAttendees")}
                className="field"
              />
              <p className="mt-1 text-[0.68rem] text-ivory/40">
                Separate from aircraft passengers.
              </p>
            </FormField>
            <FormField label="Estimated budget">
              <div className="flex gap-2">
                <select
                  value={values.currency}
                  onChange={changeText("currency")}
                  className="field w-28 shrink-0"
                >
                  {["INR", "USD", "EUR", "GBP", "AED"].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.budget}
                  onChange={changeText("budget")}
                  className="field"
                  placeholder="Optional"
                />
              </div>
            </FormField>
            <FormField label="Date flexibility">
              <select
                value={values.dateFlexibility}
                onChange={changeText("dateFlexibility")}
                className="field"
              >
                <option value="FIXED">Fixed date</option>
                <option value="FLEXIBLE">Flexible dates</option>
                <option value="TO_BE_CONFIRMED">To be confirmed</option>
              </select>
            </FormField>
            <FormField label="Event notes" className="md:col-span-2">
              <textarea
                value={values.eventNotes}
                onChange={changeText("eventNotes")}
                rows={3}
                className="field resize-y"
              />
            </FormField>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Aviation service">
              <select
                value={values.aircraftKind}
                onChange={changeText("aircraftKind")}
                className="field"
              >
                <option value="flight">Private jet / aircraft</option>
                <option value="helicopter">Helicopter</option>
              </select>
            </FormField>
            <FormField label="Preferred aircraft (optional)">
              <input
                value={values.preferredAircraft}
                onChange={changeText("preferredAircraft")}
                className="field"
                placeholder="Preference only; not an allocation"
              />
            </FormField>
            <FormField label="Aircraft passengers">
              <input
                type="number"
                min={1}
                step={1}
                value={values.passengerCount || ""}
                onChange={changeNumber("passengerCount")}
                className="field"
              />
              <p className="mt-1 text-[0.68rem] text-ivory/40">
                This is the number boarding the aircraft, not all event attendees.
              </p>
            </FormField>
            <FormField label="Flight type">
              <select value={values.tripType} onChange={changeText("tripType")} className="field">
                <option value="ONE_WAY">One way / experience flight</option>
                <option value="ROUND_TRIP">Round trip</option>
              </select>
            </FormField>
            <FormField label="Departure / pickup location">
              <input
                value={values.departure}
                onChange={changeText("departure")}
                className="field"
                placeholder="Airport, heliport or location"
              />
            </FormField>
            <FormField
              label={
                values.tripType === "ROUND_TRIP"
                  ? "Destination / arrival location"
                  : "Destination (if applicable)"
              }
            >
              <input
                value={values.destination}
                onChange={changeText("destination")}
                className="field"
              />
            </FormField>
            {values.timing === "SCHEDULED" && (
              <>
                <FormField label="Preferred flight date">
                  <input
                    type="date"
                    min={localDateString()}
                    value={values.departureDate}
                    onChange={changeText("departureDate")}
                    className="field"
                  />
                </FormField>
                <FormField label="Preferred departure time">
                  <input
                    type="time"
                    value={values.departureTime}
                    onChange={changeText("departureTime")}
                    className="field"
                  />
                </FormField>
              </>
            )}
            {values.tripType === "ROUND_TRIP" && (
              <>
                <FormField label="Return date">
                  <input
                    type="date"
                    min={values.eventDate || localDateString()}
                    value={values.returnDate}
                    onChange={changeText("returnDate")}
                    className="field"
                  />
                </FormField>
                <FormField label="Return time">
                  <input
                    type="time"
                    value={values.returnTime}
                    onChange={changeText("returnTime")}
                    className="field"
                  />
                </FormField>
              </>
            )}
            <div className="md:col-span-2">
              <p className="whisper text-champagne">OPTIONAL GROUND ARRANGEMENTS</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CheckField
                  label="Ground pickup"
                  checked={values.groundPickup}
                  onChange={check("groundPickup")}
                />
                <CheckField
                  label="Vehicle transfer"
                  checked={values.vehicleTransfer}
                  onChange={check("vehicleTransfer")}
                />
                <CheckField
                  label="VIP reception"
                  checked={values.vipReception}
                  onChange={check("vipReception")}
                />
                <CheckField
                  label="Baggage coordination"
                  checked={values.baggageCoordination}
                  onChange={check("baggageCoordination")}
                />
                <CheckField
                  label="Accessibility assistance"
                  checked={values.accessibilityAssistance}
                  onChange={check("accessibilityAssistance")}
                />
              </div>
            </div>
            <FormField label="Special aviation requirements" className="md:col-span-2">
              <textarea
                value={values.aviationNotes}
                onChange={changeText("aviationNotes")}
                rows={3}
                className="field resize-y"
              />
            </FormField>
            <p className="md:col-span-2 text-xs leading-5 text-ivory/40">
              Aircraft, routing, landing locations, permissions, weather and operational feasibility
              are subject to verification. A preference is not an allocation.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-5 md:grid-cols-2">
            <CheckField
              label="Catering requested"
              checked={values.cateringRequired}
              onChange={check("cateringRequired")}
            />
            <FormField label="Dietary preferences">
              <input
                value={values.dietaryPreferences}
                onChange={changeText("dietaryPreferences")}
                className="field"
                placeholder="Separate preferences with commas"
              />
            </FormField>
            <FormField label="Meal preferences">
              <input
                value={values.mealPreferences}
                onChange={changeText("mealPreferences")}
                className="field"
              />
            </FormField>
            <FormField label="Catering notes">
              <input
                value={values.cateringNotes}
                onChange={changeText("cateringNotes")}
                className="field"
              />
            </FormField>
            <CheckField
              label="Beverage service requested"
              checked={values.beverageRequired}
              onChange={check("beverageRequired")}
            />
            <FormField label="Beverage preferences">
              <input
                value={values.beveragePreferences}
                onChange={changeText("beveragePreferences")}
                className="field"
                placeholder="Non-alcoholic or other preferences"
              />
            </FormField>
            <CheckField
              label="Ask about champagne service"
              checked={values.champagneRequested}
              onChange={check("champagneRequested")}
            />
            <p className="text-xs leading-5 text-ivory/40">
              All catering and beverage requests are subject to availability, legality and operator
              approval.
            </p>
            <CheckField
              label="Decorations requested"
              checked={values.decorationRequired}
              onChange={check("decorationRequired")}
            />
            <FormField label="Occasion theme">
              <input
                value={values.decorationTheme}
                onChange={changeText("decorationTheme")}
                className="field"
              />
            </FormField>
            <FormField label="Decoration notes">
              <input
                value={values.decorationNotes}
                onChange={changeText("decorationNotes")}
                className="field"
              />
            </FormField>
            <CheckField
              label="Photography / videography requested"
              checked={values.photographyRequired}
              onChange={check("photographyRequired")}
            />
            <FormField label="Photography notes">
              <input
                value={values.photographyNotes}
                onChange={changeText("photographyNotes")}
                className="field"
              />
            </FormField>
            <FormField label="VIP guest arrangements">
              <input
                value={values.vipRequirements}
                onChange={changeText("vipRequirements")}
                className="field"
                placeholder="Separate requirements with commas"
              />
            </FormField>
            <FormField label="Privacy requirements">
              <input
                value={values.privacyRequirements}
                onChange={changeText("privacyRequirements")}
                className="field"
              />
            </FormField>
            <FormField label="Special assistance">
              <input
                value={values.specialAssistance}
                onChange={changeText("specialAssistance")}
                className="field"
              />
            </FormField>
            <FormField label="Other experience requirements" className="md:col-span-2">
              <textarea
                value={values.preferenceNotes}
                onChange={changeText("preferenceNotes")}
                rows={3}
                className="field resize-y"
              />
            </FormField>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Full name">
              <input
                value={values.contactName}
                onChange={changeText("contactName")}
                className="field"
                autoComplete="name"
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                value={values.contactEmail}
                onChange={changeText("contactEmail")}
                className="field"
                autoComplete="email"
              />
            </FormField>
            <FormField label="Mobile">
              <input
                type="tel"
                value={values.contactMobile}
                onChange={changeText("contactMobile")}
                className="field"
                autoComplete="tel"
              />
            </FormField>
            <FormField label="Country">
              <input
                value={values.country}
                onChange={changeText("country")}
                className="field"
                autoComplete="country-name"
              />
            </FormField>
            <FormField label="Company (optional)">
              <input
                value={values.company}
                onChange={changeText("company")}
                className="field"
                autoComplete="organization"
              />
            </FormField>
            <FormField label="Event coordinator (optional)">
              <input
                value={values.coordinatorName}
                onChange={changeText("coordinatorName")}
                className="field"
              />
            </FormField>
            <FormField label="Alternate contact number (optional)">
              <input
                type="tel"
                value={values.alternatePhone}
                onChange={changeText("alternatePhone")}
                className="field"
              />
            </FormField>
            <FormField label="Preferred contact method">
              <select
                value={values.preferredContactMethod}
                onChange={changeText("preferredContactMethod")}
                className="field"
              >
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </FormField>
            <FormField label="Contact notes (optional)" className="md:col-span-2">
              <textarea
                value={values.contactNotes}
                onChange={changeText("contactNotes")}
                rows={2}
                className="field resize-y"
              />
            </FormField>
            <p className="md:col-span-2 text-xs leading-5 text-ivory/40">
              These details apply to this request only and will not update your permanent profile.
            </p>
          </div>
        )}

        {step === 5 && (
          <ReviewSummary
            values={values}
            checked={values.acknowledged}
            onChange={check("acknowledged")}
          />
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-white/15 px-4 py-3 text-xs tracking-[0.12em] text-ivory/55 hover:text-ivory"
            >
              CLOSE
            </button>
            <button
              type="button"
              disabled={saving || submitting}
              onClick={() => void saveDraft()}
              className="border border-white/20 px-4 py-3 text-xs tracking-[0.12em] text-ivory/80 hover:border-champagne/50 disabled:opacity-40"
            >
              {saving ? "SAVING…" : "SAVE & EXIT"}
            </button>
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStep((current) => current - 1);
                  setError("");
                }}
                className="inline-flex items-center gap-1 border border-white/20 px-4 py-3 text-xs tracking-[0.12em] text-ivory hover:border-champagne/50"
              >
                <ChevronLeft size={15} /> BACK
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  const validationError = validateStep(step);
                  if (validationError) {
                    setError(validationError);
                    return;
                  }
                  setError("");
                  setStep((current) => current + 1);
                }}
                className="inline-flex items-center gap-2 bg-champagne px-5 py-3 text-xs tracking-[0.12em] text-obsidian hover:bg-ivory"
              >
                CONTINUE <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || saving}
                className="inline-flex items-center gap-2 bg-champagne px-5 py-3 text-xs tracking-[0.12em] text-obsidian hover:bg-ivory disabled:cursor-wait disabled:opacity-50"
              >
                {submitting ? "SUBMITTING…" : "SUBMIT EVENT REQUEST"}{" "}
                {!submitting && <ArrowRight size={15} />}
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

function ReviewSummary({
  values,
  checked,
  onChange,
}: {
  values: EventRequestValues;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const rows: [string, string][] = [
    ["Event / occasion", values.eventName || "Not provided"],
    ["Selected experience", values.experienceName || "Not provided"],
    [
      "Category",
      values.subtype === "EMERGENCY" ? "Urgent aviation request" : "Special event aviation",
    ],
    ["Purpose", values.purpose],
    ["Event date", values.eventDate || "To be arranged"],
    [
      "Event location",
      [values.venue, values.eventCity].filter(Boolean).join(", ") || values.departure,
    ],
    ["Total event attendees", String(values.totalAttendees)],
    [
      "Aviation service",
      values.aircraftKind === "helicopter" ? "Helicopter" : "Private jet / aircraft",
    ],
    ["Aircraft passengers", String(values.passengerCount)],
    ["Preferred aircraft", values.preferredAircraft || "No preference"],
    [
      "Journey",
      `${values.departure || "Departure TBC"} → ${values.destination || "Destination / route to be discussed"}`,
    ],
    [
      "Estimated budget",
      values.budget
        ? `${values.currency} ${Number(values.budget).toLocaleString()}`
        : "Not specified",
    ],
    ["Contact", `${values.contactName} · ${values.contactEmail} · ${values.contactMobile}`],
  ];
  return (
    <div className="space-y-5">
      <div className="border border-champagne/25 bg-champagne/[0.04] p-4 text-sm leading-6 text-ivory/65">
        Submission creates an enquiry for review. It does not confirm aircraft, price, schedule,
        landing permissions, catering, ground services or any other availability.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="border border-white/10 p-4">
            <p className="whisper text-ivory/40">{label}</p>
            <p className="mt-2 text-sm text-ivory">{value}</p>
          </div>
        ))}
      </div>
      <div className="border border-white/10 p-4">
        <p className="whisper text-champagne">EXPERIENCE PREFERENCES</p>
        <p className="mt-2 text-sm leading-6 text-ivory/65">
          {[
            values.cateringRequired && "Catering",
            values.beverageRequired && "Beverage service",
            values.champagneRequested && "Champagne request",
            values.decorationRequired && "Decorations",
            values.photographyRequired && "Photography",
            values.groundPickup && "Ground pickup",
            values.vehicleTransfer && "Vehicle transfer",
            values.vipReception && "VIP reception",
            values.accessibilityAssistance && "Accessibility assistance",
          ]
            .filter(Boolean)
            .join(" · ") || "No optional services selected"}
        </p>
        {values.aviationNotes && (
          <p className="mt-3 text-sm text-ivory/60">
            Aviation requirements: {values.aviationNotes}
          </p>
        )}
        {values.preferenceNotes && (
          <p className="mt-2 text-sm text-ivory/60">Additional notes: {values.preferenceNotes}</p>
        )}
      </div>
      <label className="flex items-start gap-3 border border-white/10 p-4 text-xs leading-5 text-ivory/55">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="mt-0.5 accent-[var(--champagne)]"
        />
        I understand this is a request/enquiry. Services are subject to availability and quotation,
        and all flight operations, permissions and venue feasibility require operational approval.
      </label>
    </div>
  );
}

function EventRequestCard({
  request,
  onView,
}: {
  request: EventRequestRecord;
  onView: () => void;
}) {
  const event = request.service_details?.event;
  const date = stringValue(event?.event_date) || request.start_date || "Date to be arranged";
  const location =
    [stringValue(event?.city), stringValue(event?.venue)].filter(Boolean).join(" · ") ||
    request.departure ||
    "Location to be arranged";
  return (
    <article className="border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="whisper text-champagne">
            {request.request_number} ·{" "}
            {request.service_subtype === "EMERGENCY" ? "URGENT AVIATION" : "EVENT ENQUIRY"}
          </p>
          <h3 className="mt-2 font-serif text-2xl text-ivory">
            {stringValue(event?.name) || "Aviation experience request"}
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ivory/50">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} /> {date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Plane size={14} /> {request.people_count} aircraft passenger
              {request.people_count === 1 ? "" : "s"}
            </span>
            {request.budget !== null && (
              <span>
                {request.currency} {Number(request.budget).toLocaleString()}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-ivory/35">
            {stringValue(event?.total_attendees)
              ? `${stringValue(event?.total_attendees)} total event attendees · `
              : ""}
            Submitted {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span
            className={`border px-3 py-1 text-[0.6rem] tracking-[0.12em] ${request.status === "BOOKED" || request.status === "COMPLETED" ? "border-green-300/40 text-green-200" : request.status === "CANCELLED" || request.status === "REJECTED" ? "border-red-300/40 text-red-200" : "border-champagne/40 text-champagne"}`}
          >
            {statusLabel(request.status)}
          </span>
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1 text-xs text-ivory/65 hover:text-champagne"
          >
            VIEW DETAILS <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

function RequestDetailsDialog({
  request,
  onClose,
}: {
  request: EventRequestRecord;
  onClose: () => void;
}) {
  const details = request.service_details;
  const event = details?.event;
  const aviation = details?.aviation;
  const preferences = details?.preferences;
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-request-detail-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-champagne/25 bg-obsidian p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="whisper text-champagne">{request.request_number}</p>
            <h2 id="event-request-detail-title" className="mt-2 font-serif text-3xl text-ivory">
              {stringValue(event?.name) || "Event request details"}
            </h2>
            <p className="mt-2 text-sm text-ivory/50">
              {statusLabel(request.status)} · Submitted{" "}
              {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close request details"
            className="border border-white/15 p-2 text-ivory/55 hover:text-ivory"
          >
            <X size={17} />
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <DetailValue
            label="Category / purpose"
            value={`${request.service_subtype ?? "EVENT_AVIATION"} · ${stringValue(event?.purpose) || "Special event"}`}
          />
          <DetailValue
            label="Event date"
            value={stringValue(event?.event_date) || "To be arranged"}
          />
          <DetailValue
            label="Location"
            value={
              [
                stringValue(event?.venue),
                stringValue(event?.city),
                stringValue(event?.venue_address),
              ]
                .filter(Boolean)
                .join(", ") || "To be arranged"
            }
          />
          <DetailValue
            label="Event attendees"
            value={stringValue(event?.total_attendees) || "Not specified"}
          />
          <DetailValue label="Aircraft passengers" value={String(request.people_count)} />
          <DetailValue
            label="Aviation service"
            value={stringValue(aviation?.service_type) || "To be arranged"}
          />
          <DetailValue
            label="Preferred aircraft"
            value={stringValue(aviation?.preferred_aircraft) || "No preference"}
          />
          <DetailValue
            label="Route"
            value={`${request.departure || "TBC"} → ${request.destination || "TBC"}`}
          />
          <DetailValue
            label="Estimated budget"
            value={
              request.budget === null
                ? "Not specified"
                : `${request.currency} ${Number(request.budget).toLocaleString()}`
            }
          />
          <DetailValue
            label="Contact preference"
            value={stringValue(details?.contact?.preferred_contact_method) || "Not specified"}
          />
        </div>
        <div className="mt-5 border border-white/10 p-4">
          <p className="whisper text-champagne">PREFERENCES & REQUIREMENTS</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ivory/65">
            {[
              `Catering: ${preferences?.catering_required ? "requested" : "not requested"}`,
              `Beverages: ${preferences?.beverage_service_required ? "requested" : "not requested"}`,
              `Decorations: ${preferences?.decoration_required ? "requested" : "not requested"}`,
              `Photography: ${preferences?.photography_required ? "requested" : "not requested"}`,
              stringValue(aviation?.special_requirements),
              ...(request.additional_requirements ? [request.additional_requirements] : []),
            ]
              .filter(Boolean)
              .join("\n")}
          </p>
        </div>
        <p className="mt-5 text-xs leading-5 text-ivory/40">
          This request does not confirm aircraft, schedule, pricing or operational permissions.
          Confirmation follows the existing review and quotation process.
        </p>
      </section>
    </div>
  );
}

function ExperienceDetails({
  subtype,
  onClose,
  onRequest,
}: {
  subtype: EventSubtype;
  onClose: () => void;
  onRequest: () => void;
}) {
  const experience = experiences.find((item) => item.subtype === subtype);
  if (!experience) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-detail-title"
        className="w-full max-w-xl border border-champagne/25 bg-obsidian p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="whisper text-champagne">
              {experience.subtype === "SPECIAL"
                ? "EXISTING CATEGORY · SPECIAL"
                : "EXISTING CATEGORY · EMERGENCY"}
            </p>
            <h2 id="experience-detail-title" className="mt-2 font-serif text-3xl text-ivory">
              {experience.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close experience details"
            className="border border-white/15 p-2 text-ivory/55 hover:text-ivory"
          >
            <X size={17} />
          </button>
        </div>
        <p className="mt-5 text-sm leading-6 text-ivory/60">{experience.description}</p>
        <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm leading-6 text-ivory/55">
          <p>
            <strong className="text-ivory/80">Service:</strong> Aviation request, submitted through
            the existing customer request workflow.
          </p>
          <p>
            <strong className="text-ivory/80">Typical details:</strong> Preferred aircraft category,
            passengers, timing, route and occasion requirements.
          </p>
          <p>
            <strong className="text-ivory/80">Operational review:</strong> Aircraft, timing, landing
            permissions, venue feasibility and any service preference must be verified.
          </p>
          <p>
            <strong className="text-ivory/80">Pricing:</strong> Prepared by the team after review;
            no price or availability is guaranteed here.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequest}
          className="mt-6 inline-flex items-center gap-2 bg-champagne px-5 py-3 text-xs tracking-[0.12em] text-obsidian hover:bg-ivory"
        >
          REQUEST THIS EXPERIENCE <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="whisper text-champagne">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl font-light text-ivory">{title}</h2>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ivory/50">{description}</p>
      )}
    </div>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="whisper text-ivory/55">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 border border-white/10 px-3 py-2 text-sm text-ivory/70">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-[var(--champagne)]"
      />
      {label}
    </label>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 p-4">
      <p className="whisper text-ivory/40">{label}</p>
      <p className="mt-2 break-words text-sm text-ivory">{value}</p>
    </div>
  );
}

function emptyEventRequestValues(subtype: EventSubtype): EventRequestValues {
  return {
    subtype,
    purpose: "Anniversary",
    customExperience: "",
    experienceName: "",
    timing: "SCHEDULED",
    eventName: "",
    eventDate: "",
    eventStartTime: "",
    eventEndDate: "",
    eventEndTime: "",
    eventCity: "",
    venue: "",
    venueAddress: "",
    totalAttendees: 0,
    budget: "",
    currency: "INR",
    dateFlexibility: "FIXED",
    eventNotes: "",
    aircraftKind: "flight",
    preferredAircraft: "",
    passengerCount: 0,
    tripType: "ONE_WAY",
    departure: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    groundPickup: false,
    vehicleTransfer: false,
    vipReception: false,
    baggageCoordination: false,
    accessibilityAssistance: false,
    aviationNotes: "",
    cateringRequired: false,
    dietaryPreferences: "",
    mealPreferences: "",
    cateringNotes: "",
    beverageRequired: false,
    beveragePreferences: "",
    champagneRequested: false,
    decorationRequired: false,
    decorationTheme: "",
    decorationNotes: "",
    photographyRequired: false,
    photographyNotes: "",
    vipRequirements: "",
    privacyRequirements: "",
    specialAssistance: "",
    preferenceNotes: "",
    contactName: "",
    contactEmail: "",
    contactMobile: "",
    country: "",
    company: "",
    coordinatorName: "",
    alternatePhone: "",
    preferredContactMethod: "EMAIL",
    contactNotes: "",
    acknowledged: false,
  };
}

function localDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function splitPreferences(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted · awaiting review",
    UNDER_REVIEW: "Under review",
    SALES_CONTACTED: "Sales has contacted you",
    OPTIONS_FOUND: "Options found",
    QUOTE_SENT: "Quote sent",
    CUSTOMER_APPROVAL: "Awaiting your approval",
    PAYMENT_PENDING: "Payment pending",
    BOOKED: "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REJECTED: "Closed",
    EXPIRED: "Expired",
  };
  return labels[status] ?? status;
}
