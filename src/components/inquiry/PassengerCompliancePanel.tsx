import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createPassenger,
  documentTypeLabel,
  getPassengerDocumentUrl,
  listRequestPassengers,
  passengerDocumentTypes,
  removePassenger,
  reviewPassengerDocument,
  uploadPassengerDocument,
  type Passenger,
  type PassengerDocument,
  type PassengerDocumentType,
  type PassengerInput,
  type PassengerType,
} from "@/lib/passenger-service";
import { BookingOperationsPanel } from "@/components/inquiry/BookingOperationsPanel";

const emptyPassenger: PassengerInput = {
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
};

const inputClass = "field mt-2";

function statusClass(status: string) {
  if (status === "COMPLETE" || status === "VERIFIED") return "border-green-300/30 text-green-200";
  if (status === "ACTION_REQUIRED" || status === "REJECTED" || status === "EXPIRED")
    return "border-red-300/30 text-red-200";
  return "border-champagne/30 text-champagne";
}

export function PassengerCompliancePanel({
  requestId,
  canReview = false,
}: {
  requestId: string;
  canReview?: boolean;
}) {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [form, setForm] = useState<PassengerInput>(emptyPassenger);
  const [documentType, setDocumentType] = useState<PassengerDocumentType>("GOVERNMENT_PHOTO_ID");
  const [documentMeta, setDocumentMeta] = useState({
    documentReference: "",
    visaType: "",
    issuingCountry: "",
    issueDate: "",
    expiryDate: "",
  });
  const [selectedPassenger, setSelectedPassenger] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState("");
  const [removing, setRemoving] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    try {
      setPassengers(await listRequestPassengers(requestId));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load passenger compliance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [requestId]);

  function updateForm<K extends keyof PassengerInput>(key: K, value: PassengerInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitPassenger(event: FormEvent) {
    event.preventDefault();
    if (!form.full_legal_name.trim() || !form.nationality.trim()) {
      setError("Full legal name and nationality are required.");
      return;
    }
    if (!form.emergency_contact_name?.trim() || !form.emergency_contact_phone?.trim()) {
      setError("Emergency contact name and phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createPassenger(requestId, { ...form, date_of_birth: form.date_of_birth || null });
      setForm(emptyPassenger);
      setNotice("Passenger added. Upload the required documents below.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add passenger.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePassenger(passenger: Passenger) {
    if (!window.confirm(`Remove ${passenger.full_legal_name} from the manifest?`)) return;
    setRemoving(passenger.id);
    setError("");
    setNotice("");
    try {
      await removePassenger(passenger.id);
      setNotice(`${passenger.full_legal_name} removed.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove passenger.");
    } finally {
      setRemoving("");
    }
  }

  async function uploadDocument(passenger: Passenger, file: File | undefined) {
    if (!file) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await uploadPassengerDocument(passenger, file, { documentType, ...documentMeta });
      setNotice(`${documentTypeLabel(documentType)} uploaded for ${passenger.full_legal_name}.`);
      setDocumentMeta({
        documentReference: "",
        visaType: "",
        issuingCountry: "",
        issueDate: "",
        expiryDate: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload document.");
    } finally {
      setSaving(false);
    }
  }

  async function review(
    document: PassengerDocument,
    status: "UNDER_REVIEW" | "VERIFIED" | "REJECTED",
    originalDocumentSeen = false,
  ) {
    let rejectionReason: string | undefined;
    let verificationNotes: string | undefined;
    if (status === "REJECTED") {
      rejectionReason = window.prompt("Rejection reason") ?? "";
      if (!rejectionReason.trim()) return;
    }
    if (originalDocumentSeen) {
      verificationNotes = window.prompt("Record the physical-original verification note") ?? "";
      if (!verificationNotes.trim()) return;
    }
    setReviewing(document.id);
    setError("");
    setNotice("");
    try {
      if (
        status === "VERIFIED" &&
        originalDocumentSeen &&
        !window.confirm("Confirm that the original physical document was seen.")
      )
        return;
      await reviewPassengerDocument(
        document.id,
        status,
        rejectionReason,
        originalDocumentSeen,
        verificationNotes,
      );
      setNotice(`Document marked ${status.toLowerCase().replace("_", " ")}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update document status.");
    } finally {
      setReviewing("");
    }
  }

  async function openDocument(document: PassengerDocument) {
    try {
      window.open(await getPassengerDocumentUrl(document), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open document.");
    }
  }

  return (
    <section className="mt-5 border-t border-ivory/10 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="whisper text-champagne">PASSENGER MANIFEST</p>
          <p className="mt-2 text-sm text-ivory/50">
            Identity documents are reviewed separately for each passenger.
          </p>
        </div>
        <span className="text-xs text-ivory/45">
          {passengers.length} passenger{passengers.length === 1 ? "" : "s"}
        </span>
      </div>
      {error && <p className="mt-4 border border-red-300/30 p-3 text-sm text-red-100">{error}</p>}
      {notice && (
        <p className="mt-4 border border-green-300/20 p-3 text-sm text-green-100">{notice}</p>
      )}
      {loading ? (
        <p className="mt-5 text-sm text-ivory/40">Loading passenger records...</p>
      ) : (
        <div className="mt-5 space-y-4">
          {passengers.map((passenger) => (
            <article key={passenger.id} className="border border-ivory/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl text-ivory">{passenger.full_legal_name}</p>
                  <p className="mt-1 text-xs text-ivory/45">
                    {passenger.passenger_type.replaceAll("_", " ")} · {passenger.nationality}
                    {passenger.is_foreign_national ? " · Foreign national" : ""}
                    {passenger.pnr ? ` · PNR ${passenger.pnr}` : ""}
                    {passenger.sector ? ` · ${passenger.sector}` : ""}
                  </p>
                </div>
                <span
                  className={`border px-2 py-1 whisper text-[0.58rem] ${statusClass(passenger.compliance_status)}`}
                >
                  {passenger.compliance_status.replaceAll("_", " ")}
                </span>
                {!canReview && (
                  <button
                    type="button"
                    disabled={removing === passenger.id}
                    onClick={() => void deletePassenger(passenger)}
                    className="border border-red-300/30 px-2 py-1 whisper text-[0.58rem] text-red-200 hover:bg-red-300/10 disabled:opacity-40"
                  >
                    {removing === passenger.id ? "REMOVING..." : "REMOVE"}
                  </button>
                )}
              </div>
              {passenger.missing_documents.length > 0 && (
                <p className="mt-3 text-xs text-red-200/80">
                  Missing or unverified:{" "}
                  {passenger.missing_documents.map(documentTypeLabel).join(", ")}
                </p>
              )}
              <div className="mt-4 space-y-2">
                {passenger.passenger_documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-ivory/10 pt-3 text-xs"
                  >
                    <div>
                      <span className="text-ivory/70">
                        {documentTypeLabel(document.document_type)}
                      </span>
                      <span className="ml-2 text-ivory/35">{document.original_filename}</span>
                      {canReview &&
                        ["GOVERNMENT_PHOTO_ID", "PASSPORT"].includes(document.document_type) && (
                          <p className="mt-1 text-ivory/45">
                            Original physically seen:{" "}
                            {document.original_document_seen
                              ? `yes${document.original_verified_at ? ` · ${new Date(document.original_verified_at).toLocaleString()}` : ""}`
                              : "not recorded"}
                            {document.verification_notes ? ` · ${document.verification_notes}` : ""}
                          </p>
                        )}
                      {document.rejection_reason && (
                        <p className="mt-1 text-red-200/80">Reason: {document.rejection_reason}</p>
                      )}
                      {["PASSPORT", "VISA"].includes(document.document_type) && (
                        <p className="mt-1 text-ivory/45">
                          Date validation only:{" "}
                          {document.expiry_date &&
                          document.expiry_date < new Date().toISOString().slice(0, 10)
                            ? "stored expiry date has passed"
                            : document.expiry_date
                              ? `stored expiry date ${document.expiry_date} has not passed`
                              : "expiry date not recorded"}
                          . External government/immigration validation is not performed; staff must
                          manually review the document.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`border px-2 py-1 ${statusClass(document.status)}`}>
                        {document.status.replaceAll("_", " ")}
                      </span>
                      {canReview && (
                        <>
                          <button
                            type="button"
                            onClick={() => void openDocument(document)}
                            className="border border-ivory/20 px-2 py-1 text-ivory/65 hover:border-champagne hover:text-champagne"
                          >
                            OPEN
                          </button>
                          {document.status === "UPLOADED" && (
                            <button
                              type="button"
                              disabled={reviewing === document.id}
                              onClick={() => void review(document, "UNDER_REVIEW")}
                              className="border border-champagne/30 px-2 py-1 text-champagne disabled:opacity-40"
                            >
                              REVIEW
                            </button>
                          )}
                          {document.status !== "VERIFIED" && (
                            <button
                              type="button"
                              disabled={reviewing === document.id}
                              onClick={() => void review(document, "VERIFIED")}
                              className="border border-green-300/30 px-2 py-1 text-green-200 disabled:opacity-40"
                            >
                              VERIFY
                            </button>
                          )}
                          {document.status !== "REJECTED" && (
                            <button
                              type="button"
                              disabled={reviewing === document.id}
                              onClick={() => void review(document, "REJECTED")}
                              className="border border-red-300/30 px-2 py-1 text-red-200 disabled:opacity-40"
                            >
                              REJECT
                            </button>
                          )}
                          {document.status === "VERIFIED" &&
                            !document.original_document_seen &&
                            ["GOVERNMENT_PHOTO_ID", "PASSPORT"].includes(
                              document.document_type,
                            ) && (
                              <button
                                type="button"
                                disabled={reviewing === document.id}
                                onClick={() => void review(document, "VERIFIED", true)}
                                className="border border-green-300/30 px-2 py-1 text-green-200 disabled:opacity-40"
                              >
                                VERIFY ORIGINAL SEEN
                              </button>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <BookingOperationsPanel
                requestId={requestId}
                passenger={passenger}
                canReview={canReview}
              />
              {!canReview && (
                <div className="mt-4 border-t border-ivory/10 pt-4">
                  <p className="mb-3 whisper text-champagne">UPLOAD DOCUMENT</p>
                  <div className="mb-3">
                    <select
                      value={
                        selectedPassenger === passenger.id ? documentType : "GOVERNMENT_PHOTO_ID"
                      }
                      onChange={(event) => {
                        setSelectedPassenger(passenger.id);
                        setDocumentType(event.target.value as PassengerDocumentType);
                      }}
                      className="field w-full"
                    >
                      <option value="GOVERNMENT_PHOTO_ID">Government photo ID</option>
                      {passengerDocumentTypes
                        .filter((type) => type !== "OTHER_SUPPORTING")
                        .map((type) => (
                          <option key={type} value={type}>
                            {documentTypeLabel(type)}
                          </option>
                        ))}
                      <option value="OTHER_SUPPORTING">Other supporting document</option>
                    </select>
                  </div>
                  {selectedPassenger === passenger.id && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        value={documentMeta.documentReference}
                        onChange={(event) =>
                          setDocumentMeta((current) => ({
                            ...current,
                            documentReference: event.target.value,
                          }))
                        }
                        placeholder={
                          documentType === "PASSPORT"
                            ? "Passport number (private)"
                            : documentType === "VISA"
                              ? "Visa number/reference (private)"
                              : "Document reference (optional)"
                        }
                        className="field"
                      />
                      {documentType === "VISA" && (
                        <input
                          value={documentMeta.visaType}
                          onChange={(event) =>
                            setDocumentMeta((current) => ({
                              ...current,
                              visaType: event.target.value,
                            }))
                          }
                          placeholder="Visa type/category"
                          className="field"
                        />
                      )}
                      <input
                        value={documentMeta.issuingCountry}
                        onChange={(event) =>
                          setDocumentMeta((current) => ({
                            ...current,
                            issuingCountry: event.target.value,
                          }))
                        }
                        placeholder="Issuing country"
                        className="field"
                      />
                      <label className="block">
                        <span className="whisper text-ivory/45">Date of issue</span>
                        <input
                          type="date"
                          value={documentMeta.issueDate}
                          onChange={(event) =>
                            setDocumentMeta((current) => ({
                              ...current,
                              issueDate: event.target.value,
                            }))
                          }
                          className="field mt-1"
                        />
                      </label>
                      <label className="block">
                        <span className="whisper text-ivory/45">Expiration date</span>
                        <input
                          type="date"
                          value={documentMeta.expiryDate}
                          onChange={(event) =>
                            setDocumentMeta((current) => ({
                              ...current,
                              expiryDate: event.target.value,
                            }))
                          }
                          className="field mt-1"
                        />
                      </label>
                      {["PASSPORT", "VISA"].includes(documentType) && (
                        <p className="text-xs text-ivory/40 sm:col-span-2">
                          Number and expiry are stored securely. Only the entered expiry date is
                          checked; no external authority is queried.
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPassenger(passenger.id);
                      fileRefs.current[passenger.id]?.click();
                    }}
                    disabled={saving}
                    className="mt-4 w-full border border-champagne/40 px-3 py-2 whisper text-champagne hover:bg-champagne/10 disabled:opacity-40"
                  >
                    {saving ? "UPLOADING..." : "SELECT FILE & UPLOAD"}
                  </button>
                  <p className="mt-2 text-xs text-ivory/35">PDF, JPEG or PNG · max 10 MB</p>
                  <input
                    ref={(element) => {
                      fileRefs.current[passenger.id] = element;
                    }}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) => void uploadDocument(passenger, event.target.files?.[0])}
                  />
                </div>
              )}
            </article>
          ))}
          {!passengers.length && (
            <p className="border border-dashed border-ivory/10 p-6 text-center text-sm text-ivory/40">
              No passenger records yet.
            </p>
          )}
        </div>
      )}
      {!canReview && (
        <form
          onSubmit={submitPassenger}
          className="mt-5 border border-ivory/10 bg-white/[0.02] p-4"
        >
          <p className="whisper text-champagne">ADD PASSENGER</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="whisper text-ivory/45">Full legal name</span>
              <input
                value={form.full_legal_name}
                onChange={(event) => updateForm("full_legal_name", event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Nationality</span>
              <input
                value={form.nationality}
                onChange={(event) => updateForm("nationality", event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Date of birth</span>
              <input
                type="date"
                value={form.date_of_birth ?? ""}
                onChange={(event) => updateForm("date_of_birth", event.target.value)}
                className={inputClass}
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Passenger type</span>
              <select
                value={form.passenger_type}
                onChange={(event) =>
                  updateForm("passenger_type", event.target.value as PassengerType)
                }
                className={inputClass}
              >
                {["ADULT", "CHILD", "INFANT", "UNACCOMPANIED_MINOR"].map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ivory/65">
              <input
                type="checkbox"
                checked={form.is_foreign_national}
                onChange={(event) => updateForm("is_foreign_national", event.target.checked)}
              />{" "}
              Foreign national
            </label>
            <label className="flex items-center gap-2 text-sm text-ivory/65">
              <input
                type="checkbox"
                checked={form.visa_required}
                onChange={(event) => updateForm("visa_required", event.target.checked)}
              />{" "}
              Visa required
            </label>
            <label className="flex items-center gap-2 text-sm text-ivory/65 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.medical_fitness_required}
                onChange={(event) => updateForm("medical_fitness_required", event.target.checked)}
              />{" "}
              Medical fitness documentation required
            </label>
            <label>
              <span className="whisper text-ivory/45">Emergency contact name</span>
              <input
                value={form.emergency_contact_name ?? ""}
                onChange={(event) => updateForm("emergency_contact_name", event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Emergency contact relationship</span>
              <input
                value={form.emergency_contact_relationship ?? ""}
                onChange={(event) =>
                  updateForm("emergency_contact_relationship", event.target.value)
                }
                className={inputClass}
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Emergency contact phone</span>
              <input
                value={form.emergency_contact_phone ?? ""}
                onChange={(event) => updateForm("emergency_contact_phone", event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Next-of-kin name</span>
              <input
                value={form.next_of_kin_name ?? ""}
                onChange={(event) => updateForm("next_of_kin_name", event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Next-of-kin relationship</span>
              <input
                value={form.next_of_kin_relationship ?? ""}
                onChange={(event) => updateForm("next_of_kin_relationship", event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label>
              <span className="whisper text-ivory/45">Next-of-kin phone</span>
              <input
                value={form.next_of_kin_phone ?? ""}
                onChange={(event) => updateForm("next_of_kin_phone", event.target.value)}
                className={inputClass}
                required
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 border border-champagne/40 px-4 py-2 whisper text-champagne disabled:opacity-40"
          >
            {saving ? "SAVING..." : "ADD PASSENGER"}
          </button>
        </form>
      )}
    </section>
  );
}
