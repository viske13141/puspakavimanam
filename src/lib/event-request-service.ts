import { supabase } from "@/integrations/supabase/client";

export type EventRequestValues = {
  subtype: "SPECIAL" | "EMERGENCY";
  purpose: string;
  customExperience: string;
  experienceName: string;
  timing: "IMMEDIATE" | "SCHEDULED";
  eventName: string;
  eventDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  eventCity: string;
  venue: string;
  venueAddress: string;
  totalAttendees: number;
  budget: string;
  currency: string;
  dateFlexibility: "FIXED" | "FLEXIBLE" | "TO_BE_CONFIRMED";
  eventNotes: string;
  aircraftKind: "flight" | "helicopter";
  preferredAircraft: string;
  passengerCount: number;
  tripType: "ONE_WAY" | "ROUND_TRIP";
  departure: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  groundPickup: boolean;
  vehicleTransfer: boolean;
  vipReception: boolean;
  baggageCoordination: boolean;
  accessibilityAssistance: boolean;
  aviationNotes: string;
  cateringRequired: boolean;
  dietaryPreferences: string;
  mealPreferences: string;
  cateringNotes: string;
  beverageRequired: boolean;
  beveragePreferences: string;
  champagneRequested: boolean;
  decorationRequired: boolean;
  decorationTheme: string;
  decorationNotes: string;
  photographyRequired: boolean;
  photographyNotes: string;
  vipRequirements: string;
  privacyRequirements: string;
  specialAssistance: string;
  preferenceNotes: string;
  contactName: string;
  contactEmail: string;
  contactMobile: string;
  country: string;
  company: string;
  coordinatorName: string;
  alternatePhone: string;
  preferredContactMethod: "EMAIL" | "PHONE" | "WHATSAPP";
  contactNotes: string;
  acknowledged: boolean;
};

export type CustomerEventDraft = {
  id: string;
  form: EventRequestValues;
  step: number;
  created_at: string;
  updated_at: string;
};

type StoredDraft = {
  id: string;
  customer_id: string;
  draft_data: { form: EventRequestValues; step: number };
  created_at: string;
  updated_at: string;
};

async function authenticatedCustomerId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Your session has expired. Please sign in again.");
  return data.user.id;
}

export async function listCustomerEventDrafts(): Promise<CustomerEventDraft[]> {
  const customerId = await authenticatedCustomerId();
  const { data, error } = await supabase
    .from("customer_event_request_drafts")
    .select("id, customer_id, draft_data, created_at, updated_at")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as StoredDraft[]).map((draft) => ({
    id: draft.id,
    form: draft.draft_data.form,
    step: draft.draft_data.step,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
  }));
}

export async function saveCustomerEventDraft(input: {
  id?: string;
  form: EventRequestValues;
  step: number;
}): Promise<CustomerEventDraft> {
  const customerId = await authenticatedCustomerId();
  const { data, error } = await supabase
    .from("customer_event_request_drafts")
    .upsert(
      {
        ...(input.id ? { id: input.id } : {}),
        customer_id: customerId,
        draft_data: { form: input.form, step: input.step },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, customer_id, draft_data, created_at, updated_at")
    .single();
  if (error) throw error;
  const draft = data as unknown as StoredDraft;
  return {
    id: draft.id,
    form: draft.draft_data.form,
    step: draft.draft_data.step,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
  };
}

export async function deleteCustomerEventDraft(draftId: string): Promise<void> {
  const customerId = await authenticatedCustomerId();
  const { error } = await supabase
    .from("customer_event_request_drafts")
    .delete()
    .eq("id", draftId)
    .eq("customer_id", customerId);
  if (error) throw error;
}
