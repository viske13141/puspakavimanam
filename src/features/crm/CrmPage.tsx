import { pageTitle, type Page } from "./config";
import { Dashboard } from "./dashboard";
import { Leads } from "./leads";
import { Pipeline } from "./pipeline";
import { Customers, Tasks, Quotations, EnquiriesBookings } from "./sales";
import { Assignments, Duplicates, Campaigns, Integrations } from "./management";
import { Communications, EmailSms } from "./communications";
import { Performance, Exports, Settings, AuditLogs } from "./admin";
const descriptions: Partial<Record<Page, string>> = {
  leads: "Every enquiry is the beginning of a remarkable journey.",
  pipeline: "Move opportunities forward, from first contact to a confirmed relationship.",
  customers: "A complete picture of the people and businesses who fly with you.",
  assignments: "Connect every opportunity with the right aviation specialist.",
  duplicates: "Review matching contacts and preserve the complete relationship history.",
  enquiries: "Aviation and event requirements, connected to your sales workspace.",
  quotations: "Thoughtful proposals. Clear pricing. A seamless next step.",
  bookings: "Follow every booking from sales confirmation to operations handover.",
  followups: "The right conversation, at the right time.",
  tasks: "Bring focus to the work that moves relationships forward.",
  campaigns: "Understand the campaigns behind your next customer.",
  integrations: "Bring your lead sources and conversations together.",
  inbox: "Every conversation, in one considered workspace.",
  settings: "Make the workspace work for your team.",
};
export function CrmPage({ page }: { page: Page }) {
  if (page === "dashboard" || page === "analytics" || page === "reports")
    return <Dashboard analytics={page === "analytics"} report={page === "reports"} />;
  let content;
  switch (page) {
    case "leads":
      content = <Leads />;
      break;
    case "social-leads":
      content = <Leads channel="social" />;
      break;
    case "whatsapp-leads":
      content = <Leads channel="whatsapp" />;
      break;
    case "website-leads":
      content = <Leads channel="website" />;
      break;
    case "pipeline":
      content = <Pipeline />;
      break;
    case "customers":
      content = <Customers />;
      break;
    case "assignments":
      content = <Assignments />;
      break;
    case "duplicates":
      content = <Duplicates />;
      break;
    case "enquiries":
      content = <EnquiriesBookings />;
      break;
    case "bookings":
      content = <EnquiriesBookings bookings />;
      break;
    case "quotations":
      content = <Quotations />;
      break;
    case "tasks":
      content = <Tasks />;
      break;
    case "followups":
      content = <Tasks followups />;
      break;
    case "campaigns":
      content = <Campaigns />;
      break;
    case "integrations":
      content = <Integrations />;
      break;
    case "inbox":
      content = <Communications />;
      break;
    case "conversations":
      content = <Communications history />;
      break;
    case "email-sms":
      content = <EmailSms />;
      break;
    case "performance":
      content = <Performance />;
      break;
    case "exports":
      content = <Exports />;
      break;
    case "settings":
      content = <Settings />;
      break;
    case "audit-logs":
      content = <AuditLogs />;
      break;
  }
  return (
    <>
      <div className="crm-page-heading">
        <div>
          <p className="crm-eyebrow">VIMAN · RELATIONSHIPS, ELEVATED</p>
          <h1>{pageTitle(page)}</h1>
          <p>
            {descriptions[page] ??
              "Connected insights and thoughtful tools for your aviation business."}
          </p>
        </div>
        <span className="crm-page-date">
          12 OCTOBER 2026 <span>•</span> DEMO
        </span>
      </div>
      {content}
    </>
  );
}
