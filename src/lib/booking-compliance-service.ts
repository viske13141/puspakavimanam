import { supabase } from "@/integrations/supabase/client";

export type BookingRecord = {
  id: string;
  request_id: string;
  pnr: string;
  booking_status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  booking_date: string;
  travel_date: string | null;
  departure: string | null;
  destination: string | null;
  aircraft_kind: string | null;
  aircraft_model: string | null;
  photography_restrictions_applicable: boolean;
};

export type BookingTicket = {
  id: string;
  booking_id: string;
  passenger_id: string;
  ticket_number: string;
  passenger_name: string;
  sector: string | null;
  ticket_data: Record<string, unknown>;
  generated_at: string;
};

export type WeightDeclaration = {
  id: string;
  booking_id: string;
  passenger_id: string;
  body_weight_kg: number;
  hand_baggage_weight_kg: number;
  body_weight_confirmed: boolean;
  hand_baggage_confirmed: boolean;
  signature_name: string;
  declared_at: string;
};

export type PhysicalWeighing = {
  id: string;
  passenger_id: string;
  measured_body_weight_kg: number;
  measured_hand_baggage_weight_kg: number;
  verified: boolean;
  performed_at: string;
};

export type Briefing = {
  id: string;
  passenger_id: string;
  seatbelt_harness_acknowledged: boolean;
  headset_hearing_acknowledged: boolean;
  headset_provided: boolean;
  emergency_exits_acknowledged: boolean;
  brace_position_acknowledged: boolean;
  no_smoking_acknowledged: boolean;
  rotor_loose_item_safety_acknowledged: boolean;
  no_standing_rotor_operation_acknowledged: boolean;
  weight_baggage_confirmed: boolean;
  photography_drone_acknowledged: boolean;
  diversion_delay_acknowledged: boolean;
  photography_restrictions_applicable: boolean;
  acknowledged_at: string;
};

export type WeightBalance = {
  total_passenger_weight_kg: number;
  total_baggage_weight_kg: number;
  total_additional_load_kg: number;
  applicable_payload_limit_kg: number | null;
  remaining_capacity_kg: number | null;
  calculation_status: "INCOMPLETE" | "VALID" | "WARNING" | "OVER_LIMIT";
  calculation_notes: string | null;
};

export type Checkin = {
  name_match_status: "PENDING" | "VERIFIED" | "MISMATCH" | "REQUIRES_REVIEW";
  original_document_verified: boolean;
  weight_verified: boolean;
  briefing_completed: boolean;
  checkin_status: "PENDING" | "CLEARED" | "BLOCKED" | "REQUIRES_REVIEW";
  name_reviewed_by: string | null;
  name_reviewed_at: string | null;
  name_review_notes: string | null;
  notes: string | null;
};

export type BookingDiversion = {
  id: string;
  booking_id: string;
  original_destination: string;
  revised_destination: string;
  diversion_time: string;
  reason: string;
  reason_details: string;
  pic_name: string;
  atc_fic_notified: boolean;
  dispatch_notified: boolean;
  passenger_care_action: string;
  landing_permission_status: "PENDING" | "OBTAINED" | "NOT_REQUIRED" | "NOT_VERIFIED";
  reporting_status: "NOT_ASSESSED" | "NOT_REQUIRED" | "PENDING" | "SUBMITTED" | "REVIEW_REQUIRED";
  recorded_at: string;
};

export const briefingItems = [
  ["seatbelt_harness_acknowledged", "Seatbelt and harness instructions"],
  ["headset_hearing_acknowledged", "Headset and hearing protection"],
  ["emergency_exits_acknowledged", "Emergency exits"],
  ["brace_position_acknowledged", "Brace position and emergency procedures"],
  ["no_smoking_acknowledged", "No smoking"],
  ["rotor_loose_item_safety_acknowledged", "Loose-item and rotor-area safety"],
  ["no_standing_rotor_operation_acknowledged", "No standing during rotor operation"],
  ["weight_baggage_confirmed", "Weight and baggage declaration matches boarding items"],
  ["photography_drone_acknowledged", "Photography and drone restrictions"],
  ["diversion_delay_acknowledged", "Diversion and delay procedure"],
] as const;

export type BriefingKey = (typeof briefingItems)[number][0];

export async function getBookingForRequest(requestId: string): Promise<BookingRecord | null> {
  const { data, error } = await supabase
    .from("booking_records")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw error;
  return data as BookingRecord | null;
}

export async function listBookingTickets(bookingId: string) {
  const { data, error } = await supabase
    .from("booking_tickets")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("ticket_status", "ISSUED");
  if (error) throw error;
  return (data ?? []) as BookingTicket[];
}

export async function issuePassengerTicket(passengerId: string) {
  const { data, error } = await supabase.rpc("issue_passenger_ticket", {
    target_passenger_id: passengerId,
  });
  if (error) throw error;
  return data as BookingTicket;
}

export async function saveWeightDeclaration(input: {
  bookingId: string;
  passengerId: string;
  bodyWeightKg: number;
  handBaggageWeightKg: number;
  bodyConfirmed: boolean;
  baggageConfirmed: boolean;
  signatureName: string;
}) {
  if (input.bodyWeightKg <= 0 || input.bodyWeightKg > 500)
    throw new Error("Enter a valid body weight.");
  if (input.handBaggageWeightKg < 0 || input.handBaggageWeightKg > 200)
    throw new Error("Enter a valid hand-baggage weight.");
  if (!input.bodyConfirmed || !input.baggageConfirmed || input.signatureName.trim().length < 2)
    throw new Error("Confirm both weight declarations and enter your typed signature.");
  const { data, error } = await supabase.rpc("save_passenger_weight_declaration", {
    target_booking_id: input.bookingId,
    target_passenger_id: input.passengerId,
    target_body_weight_kg: input.bodyWeightKg,
    target_hand_baggage_weight_kg: input.handBaggageWeightKg,
    target_signature_name: input.signatureName.trim(),
    target_body_confirmed: input.bodyConfirmed,
    target_baggage_confirmed: input.baggageConfirmed,
  });
  if (error) throw error;
  return data as WeightDeclaration;
}

export async function savePassengerBriefing(input: {
  bookingId: string;
  passengerId: string;
  acknowledgements: Record<BriefingKey, boolean>;
  photographyRestrictionsApplicable: boolean;
}) {
  if (
    briefingItems.some(
      ([key]) => key !== "photography_drone_acknowledged" && !input.acknowledgements[key],
    ) ||
    (input.photographyRestrictionsApplicable &&
      !input.acknowledgements.photography_drone_acknowledged)
  ) {
    throw new Error("Acknowledge every required briefing item.");
  }
  const { data, error } = await supabase.rpc("save_passenger_briefing", {
    target_booking_id: input.bookingId,
    target_passenger_id: input.passengerId,
    target_items: input.acknowledgements,
  });
  if (error) throw error;
  return data as Briefing;
}

export async function setBookingPhotographyPolicy(bookingId: string, applicable: boolean) {
  const { error } = await supabase.rpc("set_booking_photography_policy", {
    target_booking_id: bookingId,
    target_applicable: applicable,
  });
  if (error) throw error;
}

export async function recordPassengerHeadsetIssue(
  bookingId: string,
  passengerId: string,
  provided: boolean,
) {
  const { data, error } = await supabase.rpc("set_passenger_headset_provided", {
    target_booking_id: bookingId,
    target_passenger_id: passengerId,
    target_provided: provided,
  });
  if (error) throw error;
  return data as Briefing;
}

export async function reviewPassengerTicketName(input: {
  passengerId: string;
  resolution: "VERIFIED" | "REQUIRES_REVIEW";
  notes: string;
}) {
  if (input.notes.trim().length < 3) throw new Error("Add notes for the manual name review.");
  const { data, error } = await supabase.rpc("review_passenger_ticket_name", {
    target_passenger_id: input.passengerId,
    target_resolution: input.resolution,
    target_notes: input.notes.trim(),
  });
  if (error) throw error;
  return data as Checkin;
}

export async function searchBookingsByPnr(search: string) {
  const { data, error } = await supabase
    .from("booking_records")
    .select("request_id, pnr, booking_status, travel_date, departure, destination")
    .ilike("pnr", `%${search.trim()}%`)
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function listBookingDiversions(bookingId: string): Promise<BookingDiversion[]> {
  const { data, error } = await supabase
    .from("booking_diversions")
    .select("*")
    .eq("booking_id", bookingId)
    .order("diversion_time", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookingDiversion[];
}

export async function recordBookingDiversion(input: {
  bookingId: string;
  revisedDestination: string;
  reason: string;
  reasonDetails: string;
  picName: string;
  diversionTime: string;
  atcFicNotified: boolean;
  dispatchNotified: boolean;
  passengerCareAction: string;
  landingPermissionStatus: BookingDiversion["landing_permission_status"];
  reportingStatus: BookingDiversion["reporting_status"];
}) {
  if (
    !input.revisedDestination.trim() ||
    !input.reasonDetails.trim() ||
    !input.picName.trim() ||
    !input.passengerCareAction.trim()
  ) {
    throw new Error("Complete the revised destination, reason, PIC, and passenger-care action.");
  }
  const { data, error } = await supabase.rpc("record_booking_diversion", {
    target_booking_id: input.bookingId,
    target_revised_destination: input.revisedDestination.trim(),
    target_reason: input.reason,
    target_reason_details: input.reasonDetails.trim(),
    target_pic_name: input.picName.trim(),
    target_diversion_time: input.diversionTime,
    target_atc_fic_notified: input.atcFicNotified,
    target_dispatch_notified: input.dispatchNotified,
    target_passenger_care_action: input.passengerCareAction.trim(),
    target_landing_permission_status: input.landingPermissionStatus,
    target_reporting_status: input.reportingStatus,
  });
  if (error) throw error;
  return data as BookingDiversion;
}

export async function getPassengerOperations(bookingId: string, passengerId: string) {
  const [declaration, weighing, briefing, checkin] = await Promise.all([
    supabase
      .from("passenger_weight_declarations")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("passenger_id", passengerId)
      .maybeSingle(),
    supabase
      .from("physical_weighings")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("passenger_id", passengerId)
      .order("performed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("passenger_briefings")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("passenger_id", passengerId)
      .maybeSingle(),
    supabase
      .from("passenger_checkins")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("passenger_id", passengerId)
      .maybeSingle(),
  ]);
  const failure = [declaration, weighing, briefing, checkin].find((result) => result.error);
  if (failure?.error) throw failure.error;
  return {
    declaration: declaration.data as WeightDeclaration | null,
    weighing: weighing.data as PhysicalWeighing | null,
    briefing: briefing.data as Briefing | null,
    checkin: checkin.data as Checkin | null,
  };
}

export async function recordPhysicalWeighing(input: {
  bookingId: string;
  passengerId: string;
  bodyWeightKg: number;
  handBaggageWeightKg: number;
  verified: boolean;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc("record_physical_weighing", {
    target_booking_id: input.bookingId,
    target_passenger_id: input.passengerId,
    target_body_weight_kg: input.bodyWeightKg,
    target_hand_baggage_weight_kg: input.handBaggageWeightKg,
    target_verified: input.verified,
    target_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as PhysicalWeighing;
}

export async function calculateWeightBalance(bookingId: string) {
  const { data, error } = await supabase.rpc("calculate_booking_weight_balance", {
    target_booking_id: bookingId,
  });
  if (error) throw error;
  return data as WeightBalance;
}

export async function completePassengerCheckin(passengerId: string) {
  const { data, error } = await supabase.rpc("complete_passenger_checkin", {
    target_passenger_id: passengerId,
  });
  if (error) throw error;
  return data as Checkin;
}
