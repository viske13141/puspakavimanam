import { supabase } from "@/integrations/supabase/client";

export const passengerTypes = ["ADULT", "CHILD", "INFANT", "UNACCOMPANIED_MINOR"] as const;
export const passengerDocumentTypes = [
  "GOVERNMENT_PHOTO_ID",
  "PASSPORT",
  "VISA",
  "MEDICAL_FITNESS_CERTIFICATE",
  "GUARDIAN_CONSENT",
  "OTHER_SUPPORTING",
] as const;
export const passengerDocumentStatuses = [
  "UPLOADED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
] as const;

export type PassengerType = (typeof passengerTypes)[number];
export type PassengerDocumentType = (typeof passengerDocumentTypes)[number];
export type PassengerDocumentStatus = (typeof passengerDocumentStatuses)[number];
export type PassengerComplianceStatus = "COMPLETE" | "INCOMPLETE" | "ACTION_REQUIRED";

export type Passenger = {
  id: string;
  request_id: string;
  booking_id: string | null;
  pnr: string | null;
  sector: string | null;
  full_legal_name: string;
  date_of_birth: string | null;
  nationality: string;
  passenger_type: PassengerType;
  is_foreign_national: boolean;
  visa_required: boolean;
  medical_fitness_required: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_phone: string | null;
  status: "ACTIVE" | "REMOVED";
  created_at: string;
  updated_at: string;
  passenger_documents: PassengerDocument[];
  compliance_status: PassengerComplianceStatus;
  missing_documents: PassengerDocumentType[];
};

export type PassengerDocument = {
  id: string;
  passenger_id: string;
  request_id: string;
  document_type: PassengerDocumentType;
  document_reference: string | null;
  visa_type: string | null;
  issuing_country: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  status: PassengerDocumentStatus;
  rejection_reason: string | null;
  uploaded_by: string;
  uploaded_at: string;
  verified_by: string | null;
  verified_at: string | null;
  supersedes_document_id: string | null;
  original_document_seen: boolean;
  original_verified_by: string | null;
  original_verified_at: string | null;
  verification_notes: string | null;
};

export type PassengerInput = Omit<
  Passenger,
  | "id"
  | "request_id"
  | "booking_id"
  | "pnr"
  | "sector"
  | "status"
  | "created_at"
  | "updated_at"
  | "passenger_documents"
  | "compliance_status"
  | "missing_documents"
>;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export function documentTypeLabel(type: PassengerDocumentType) {
  return {
    GOVERNMENT_PHOTO_ID: "Government photo ID",
    PASSPORT: "Passport",
    VISA: "Visa",
    MEDICAL_FITNESS_CERTIFICATE: "Medical fitness certificate",
    GUARDIAN_CONSENT: "Guardian consent",
    OTHER_SUPPORTING: "Other supporting document",
  }[type];
}

function requiredDocuments(
  passenger: Pick<
    Passenger,
    "passenger_type" | "is_foreign_national" | "visa_required" | "medical_fitness_required"
  >,
): PassengerDocumentType[] {
  const required: PassengerDocumentType[] = ["GOVERNMENT_PHOTO_ID"];
  if (passenger.is_foreign_national) required.push("PASSPORT");
  if (passenger.visa_required) required.push("VISA");
  if (passenger.passenger_type === "UNACCOMPANIED_MINOR") required.push("GUARDIAN_CONSENT");
  if (passenger.medical_fitness_required) required.push("MEDICAL_FITNESS_CERTIFICATE");
  return required;
}

function effectiveStatus(document: PassengerDocument): PassengerDocumentStatus {
  if (document.expiry_date && document.expiry_date < new Date().toISOString().slice(0, 10))
    return "EXPIRED";
  return document.status;
}

function decoratePassenger(
  passenger: Omit<Passenger, "passenger_documents" | "compliance_status" | "missing_documents"> & {
    passenger_documents?: PassengerDocument[];
  },
): Passenger {
  const documents = (passenger.passenger_documents ?? []).map((document) => ({
    ...document,
    status: effectiveStatus(document),
  }));
  const requirements = requiredDocuments(passenger);
  const latestByType = new Map<PassengerDocumentType, PassengerDocument>();
  for (const document of documents.sort((left, right) =>
    right.uploaded_at.localeCompare(left.uploaded_at),
  )) {
    if (!latestByType.has(document.document_type))
      latestByType.set(document.document_type, document);
  }
  const missing = requirements.filter((type) => {
    const document = latestByType.get(type);
    return !document || effectiveStatus(document) !== "VERIFIED";
  });
  const hasAction = requirements.some((type) => {
    const document = latestByType.get(type);
    return document && ["REJECTED", "EXPIRED"].includes(effectiveStatus(document));
  });
  return {
    ...passenger,
    passenger_documents: documents,
    missing_documents: missing,
    compliance_status: hasAction ? "ACTION_REQUIRED" : missing.length ? "INCOMPLETE" : "COMPLETE",
  };
}

export async function listRequestPassengers(requestId: string): Promise<Passenger[]> {
  const { error: expiryError } = await supabase.rpc("refresh_passenger_document_expiry", {
    target_request_id: requestId,
  });
  if (expiryError && !expiryError.message.toLowerCase().includes("not authorized"))
    throw expiryError;
  const { data, error } = await supabase
    .from("passengers")
    .select("*, passenger_documents(*)")
    .eq("request_id", requestId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((passenger) =>
    decoratePassenger(passenger as Parameters<typeof decoratePassenger>[0]),
  );
}

export async function createPassenger(requestId: string, input: PassengerInput) {
  const { data, error } = await supabase
    .from("passengers")
    .insert({ request_id: requestId, ...input })
    .select("*")
    .single();
  if (error) throw error;
  return decoratePassenger({
    ...(data as Omit<Passenger, "passenger_documents" | "compliance_status" | "missing_documents">),
    passenger_documents: [],
  });
}

export async function uploadPassengerDocument(
  passenger: Passenger,
  file: File,
  input: {
    documentType: PassengerDocumentType;
    documentReference?: string;
    visaType?: string;
    issuingCountry?: string;
    issueDate?: string;
    expiryDate?: string;
  },
) {
  if (!allowedMimeTypes.has(file.type)) throw new Error("Use a PDF, JPEG, or PNG document.");
  if (file.size <= 0 || file.size > MAX_FILE_SIZE)
    throw new Error("Documents must be smaller than 10 MB.");
  if (
    ["PASSPORT", "VISA"].includes(input.documentType) &&
    (!input.documentReference?.trim() || !input.expiryDate)
  ) {
    throw new Error(
      "Passport and visa number/reference and expiry date are required for date validation.",
    );
  }
  if (input.expiryDate && input.issueDate && input.expiryDate < input.issueDate)
    throw new Error("Expiry date must be after issue date.");
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  const previous = passenger.passenger_documents.find(
    (document) =>
      document.document_type === input.documentType &&
      ["REJECTED", "EXPIRED"].includes(effectiveStatus(document)),
  );
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${user.id}/${passenger.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("passenger-documents")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from("passenger_documents")
    .insert({
      passenger_id: passenger.id,
      request_id: passenger.request_id,
      document_type: input.documentType,
      document_reference: input.documentReference?.trim() || null,
      visa_type: input.visaType?.trim() || null,
      issuing_country: input.issuingCountry || null,
      issue_date: input.issueDate || null,
      expiry_date: input.expiryDate || null,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
      status: "UPLOADED",
      uploaded_by: user.id,
      supersedes_document_id: previous?.id ?? null,
    })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from("passenger-documents").remove([storagePath]);
    throw error;
  }
  return data as PassengerDocument;
}

export async function reviewPassengerDocument(
  documentId: string,
  status: Extract<PassengerDocumentStatus, "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED">,
  rejectionReason?: string,
  originalDocumentSeen = false,
  verificationNotes?: string,
) {
  if (status === "REJECTED" && !rejectionReason?.trim())
    throw new Error("Enter a rejection reason.");
  const { data, error } = await supabase
    .from("passenger_documents")
    .update({
      status,
      rejection_reason: status === "REJECTED" ? rejectionReason?.trim() : null,
      original_document_seen: status === "VERIFIED" ? originalDocumentSeen : false,
      verification_notes: originalDocumentSeen ? verificationNotes?.trim() || null : null,
    })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data as PassengerDocument;
}

export async function removePassenger(passengerId: string) {
  const { error } = await supabase.rpc("remove_passenger", {
    target_passenger_id: passengerId,
  });
  if (error) throw error;
}

export async function getPassengerDocumentUrl(document: PassengerDocument) {
  const { data, error } = await supabase.storage
    .from("passenger-documents")
    .createSignedUrl(document.storage_path, 300);
  if (error) throw error;
  return data.signedUrl;
}
