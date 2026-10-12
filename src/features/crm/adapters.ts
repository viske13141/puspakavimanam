import { normalizeEmail, normalizePhone } from "./repository";

/** Replace mock adapters with authenticated backend clients in the API phase. */
export interface ExternalLeadPayload {
  externalId: string;
  platform: "Meta Ads" | "Facebook" | "Instagram" | "Google Ads" | "WhatsApp" | "Website";
  submittedAt: string;
  fields: Record<string, string>;
  campaignId?: string;
  consent?: string;
}
export interface LeadCaptureAdapter {
  readonly mode: "mock";
  list(): Promise<ExternalLeadPayload[]>;
  normalize(payload: ExternalLeadPayload): {
    externalId: string;
    name: string;
    email: string;
    mobile: string;
    source: string;
    originalFields: Record<string, string>;
  };
}
export const mockLeadCaptureAdapter: LeadCaptureAdapter = {
  mode: "mock",
  async list() {
    return [];
  },
  normalize(payload) {
    const name = (payload.fields["full_name"] ?? payload.fields["name"] ?? "").trim();
    const email = normalizeEmail(payload.fields["email"] ?? "");
    const raw = payload.fields["phone_number"] ?? payload.fields["mobile"] ?? "";
    const mobile = raw ? `+91${normalizePhone(raw)}` : "";
    if (!name || (!email && !mobile)) throw new Error("A name and contact method are required.");
    return {
      externalId: payload.externalId,
      name,
      email,
      mobile,
      source: payload.platform,
      originalFields: { ...payload.fields },
    };
  },
};
