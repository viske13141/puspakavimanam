import { supabase } from "@/integrations/supabase/client";

export const AIRCRAFT_DRAFT_STORAGE_KEY = "viman:aircraft-booking-draft:v1";

export type AircraftType = "helicopter" | "flight";
export type PassengerType = "ADULT" | "CHILD" | "INFANT" | "UNACCOMPANIED_MINOR";

export type AircraftSelection = {
  aircraft_type: AircraftType;
  passenger_count: number;
  budget: number;
  currency: string;
  aircraft_preference?: string;
  saved_at: string;
};

export type FlightPassenger = {
  full_legal_name: string;
  date_of_birth: string;
  nationality: string;
  passenger_type: PassengerType;
  is_foreign_national: boolean;
  visa_required: boolean;
  medical_fitness_required: boolean;
  contact_email: string;
  contact_phone: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  next_of_kin_name: string;
  next_of_kin_relationship: string;
  next_of_kin_phone: string;
};

export type AircraftBookingDraftData = Omit<AircraftSelection, "aircraft_type"> & {
  aircraft_type: AircraftType | "";
  departure: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  departure_timezone: string;
  trip_type: "ONE_WAY" | "ROUND_TRIP";
  return_date: string;
  return_time: string;
  return_timezone: string;
  flexible_dates: boolean;
  preferred_departure_window: string;
  flight_purpose: string;
  route_notes: string;
  contact: {
    full_name: string;
    email: string;
    mobile: string;
    country: string;
    company: string;
    preferred_contact_method: string;
    contact_notes: string;
  };
  passengers: FlightPassenger[];
  additional_requirements: string;
  special_assistance: string;
  accessibility_requirements: string;
  medical_assistance_required: boolean;
  baggage_notes: string;
};

export type CustomerBookingDraft = {
  id: string;
  customer_id: string;
  draft_data: AircraftBookingDraftData;
  current_step: number;
  request_id: string | null;
  created_at: string;
  updated_at: string;
};

export function readAircraftSelection(): AircraftSelection | null {
  try {
    const raw = window.localStorage.getItem(AIRCRAFT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AircraftSelection>;
    if (
      (value.aircraft_type !== "helicopter" && value.aircraft_type !== "flight") ||
      !Number.isInteger(value.passenger_count) ||
      (value.passenger_count ?? 0) < 1 ||
      typeof value.budget !== "number" ||
      !Number.isFinite(value.budget) ||
      value.budget <= 0 ||
      typeof value.currency !== "string"
    ) {
      return null;
    }
    return value as AircraftSelection;
  } catch {
    return null;
  }
}

export function saveAircraftSelection(selection: Omit<AircraftSelection, "saved_at">) {
  window.localStorage.setItem(
    AIRCRAFT_DRAFT_STORAGE_KEY,
    JSON.stringify({ ...selection, saved_at: new Date().toISOString() }),
  );
}

export function clearAircraftSelection() {
  window.localStorage.removeItem(AIRCRAFT_DRAFT_STORAGE_KEY);
}

export async function listOpenAircraftDrafts(): Promise<CustomerBookingDraft[]> {
  const { data, error } = await supabase
    .from("customer_booking_drafts")
    .select("id,customer_id,draft_data,current_step,request_id,created_at,updated_at")
    .is("request_id", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CustomerBookingDraft[];
}

export async function createAircraftDraft(
  customerId: string,
  selection: AircraftSelection,
): Promise<CustomerBookingDraft> {
  return insertAircraftDraft(customerId, selection);
}

export async function createEmptyAircraftDraft(customerId: string): Promise<CustomerBookingDraft> {
  return insertAircraftDraft(customerId, {
    aircraft_type: "",
    passenger_count: 1,
    budget: 0,
    currency: "INR",
    saved_at: new Date().toISOString(),
  });
}

async function insertAircraftDraft(
  customerId: string,
  selection: Pick<
    AircraftBookingDraftData,
    "aircraft_type" | "passenger_count" | "budget" | "currency" | "saved_at"
  >,
): Promise<CustomerBookingDraft> {
  const data: AircraftBookingDraftData = {
    ...selection,
    departure: "",
    destination: "",
    departure_date: "",
    departure_time: "",
    departure_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    trip_type: "ONE_WAY",
    return_date: "",
    return_time: "",
    return_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    flexible_dates: false,
    preferred_departure_window: "",
    flight_purpose: "",
    route_notes: "",
    contact: {
      full_name: "",
      email: "",
      mobile: "",
      country: "",
      company: "",
      preferred_contact_method: "",
      contact_notes: "",
    },
    passengers: Array.from({ length: selection.passenger_count }, () => ({
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
    })),
    additional_requirements: "",
    special_assistance: "",
    accessibility_requirements: "",
    medical_assistance_required: false,
    baggage_notes: "",
  };
  const { data: draft, error } = await supabase
    .from("customer_booking_drafts")
    .insert({ customer_id: customerId, draft_data: data, current_step: 0 })
    .select("id,customer_id,draft_data,current_step,request_id,created_at,updated_at")
    .single();
  if (error) throw error;
  return draft as unknown as CustomerBookingDraft;
}

export async function updateAircraftDraft(
  draftId: string,
  draftData: AircraftBookingDraftData,
  currentStep: number,
) {
  const { data, error } = await supabase
    .from("customer_booking_drafts")
    .update({
      draft_data: draftData,
      current_step: currentStep,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .is("request_id", null)
    .select("id")
    .single();
  if (error) throw error;
  if (!data) throw new Error("This draft is no longer available to edit.");
}

export async function deleteAircraftDraft(draftId: string) {
  const { error } = await supabase
    .from("customer_booking_drafts")
    .delete()
    .eq("id", draftId)
    .is("request_id", null);
  if (error) throw error;
}

export async function submitAircraftDraft(draftId: string) {
  const { data, error } = await supabase.rpc("submit_aircraft_booking_draft", {
    target_draft_id: draftId,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.request_id || !result?.request_number) {
    throw new Error(
      "The booking request was not confirmed. Refresh your requests before retrying.",
    );
  }
  return result as { request_id: string; request_number: string };
}
