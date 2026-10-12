export const DEMO_NOW = "2026-10-12T10:00:00+05:30";
export const services = ["Helicopter", "Private Jet", "Aviation Event", "VIP Transport"] as const;
export const sources = [
  "Meta Ads",
  "Google Ads",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Website",
  "Referral",
  "Manual",
];
export const statuses = ["New", "Contacted", "Qualified", "Unqualified", "Archived"];
export const stages = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Quote Sent",
  "Negotiation",
  "Booked",
  "Lost",
];
export interface Base {
  id: string;
  createdAt: string;
}
export interface CrmLeadSource extends Base {
  name: string;
  channel: string;
  active: boolean;
}
export interface CrmLead extends Base {
  name: string;
  email: string;
  mobile: string;
  company: string;
  city: string;
  service: string;
  source: string;
  sourceHistory: string[];
  campaignId: string;
  customerId: string;
  ownerId: string;
  status: string;
  priority: string;
  value: number;
  departure: string;
  destination: string;
  travelDate: string;
  passengers: number;
  tripType: string;
  notes: string;
  nextFollowup: string;
  responseMinutes: number;
  externalId: string;
  importStatus: string;
  consent: string;
}
export interface CrmCustomer extends Base {
  name: string;
  email: string;
  mobile: string;
  company: string;
  type: string;
  ownerId: string;
  status: string;
}
export interface CrmOpportunity extends Base {
  name: string;
  leadId: string;
  ownerId: string;
  stage: string;
  value: number;
  lossReason: string;
}
export interface CrmActivity extends Base {
  leadId: string;
  actor: string;
  action: string;
  description: string;
}
export interface CrmTask extends Base {
  title: string;
  description: string;
  leadId: string;
  ownerId: string;
  priority: string;
  due: string;
  status: string;
  type: string;
}
export interface CrmFollowUp extends CrmTask {
  outcome: string;
}
export interface CrmCampaign extends Base {
  name: string;
  platform: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  spend: number;
  service: string;
  region: string;
  description: string;
  type: string;
}
export interface CrmSalesMember extends Base {
  name: string;
  email: string;
  service: string;
  region: string;
}
export interface CrmQuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
}
export interface CrmQuotation extends Base {
  name: string;
  customerId: string;
  opportunityId: string;
  leadId: string;
  service: string;
  items: CrmQuotationItem[];
  tax: number;
  discount: number;
  currency: string;
  validUntil: string;
  terms: string;
  notes: string;
  status: string;
  ownerId: string;
}
export interface CrmEnquiry extends Base {
  name: string;
  customerId: string;
  leadId: string;
  opportunityId: string;
  service: string;
  departure: string;
  destination: string;
  travelDate: string;
  passengers: number;
  budget: number;
  status: string;
  ownerId: string;
  requirements: string;
}
export interface CrmBookingLink extends Base {
  name: string;
  customerId: string;
  leadId: string;
  opportunityId: string;
  quotationId: string;
  enquiryId: string;
  service: string;
  route: string;
  travelDate: string;
  value: number;
  ownerId: string;
  status: string;
  handover: string;
  passengers: number;
}
export interface CrmMessage extends Base {
  conversationId: string;
  text: string;
  direction: string;
  attachment: string;
}
export interface CrmConversation extends Base {
  name: string;
  leadId: string;
  channel: string;
  ownerId: string;
  unread: number;
  status: string;
  draft: string;
}
export interface CrmIntegration extends Base {
  name: string;
  status: string;
  description: string;
  lastSync: string;
  configuration: string;
}
export interface CrmAuditEvent extends Base {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
}
export interface CrmAssignment extends Base {
  leadId: string;
  ownerId: string;
  previousOwnerId: string;
  method: string;
}
export interface CrmDocumentReference extends Base {
  leadId: string;
  name: string;
  status: string;
}
export interface CrmNotification extends Base {
  text: string;
  read: boolean;
  leadId: string;
}
export interface CrmTemplate extends Base {
  name: string;
  channel: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  leadId: string;
}
export interface CrmExport extends Base {
  name: string;
  rows: number;
  columns: string;
  scope: string;
}
export interface CrmSettings {
  workspace: string;
  stages: string[];
  sources: string[];
  statuses: string[];
  priorities: string[];
  assignment: string;
  notifications: boolean;
  theme: string;
  customFields: string[];
  reviewedDuplicates: string[];
  savedViews: Record<string, string>;
  permissions: string;
  columns: string[];
}
export interface CrmData {
  version: number;
  leads: CrmLead[];
  customers: CrmCustomer[];
  opportunities: CrmOpportunity[];
  activities: CrmActivity[];
  tasks: CrmTask[];
  followups: CrmFollowUp[];
  campaigns: CrmCampaign[];
  team: CrmSalesMember[];
  quotations: CrmQuotation[];
  enquiries: CrmEnquiry[];
  bookings: CrmBookingLink[];
  conversations: CrmConversation[];
  messages: CrmMessage[];
  integrations: CrmIntegration[];
  audit: CrmAuditEvent[];
  assignments: CrmAssignment[];
  documents: CrmDocumentReference[];
  notifications: CrmNotification[];
  templates: CrmTemplate[];
  exports: CrmExport[];
  settings: CrmSettings;
}
export type Collection = Exclude<keyof CrmData, "version" | "settings">;
export type RecordOf<K extends Collection> = CrmData[K][number];
export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
export const compactMoney = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : money(n);
export const dateLabel = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
export const quoteTotal = (q: CrmQuotation) =>
  Math.max(
    0,
    q.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0) * (1 + q.tax / 100) - q.discount,
  );
export const uid = () => crypto.randomUUID();
export const isoNow = () => new Date().toISOString();
export const isOverdue = (value: string) => !!value && Date.parse(value) < Date.parse(DEMO_NOW);
export const dayKey = (value: string) =>
  value
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "";
