import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/features/crm/CrmPage";
export const Route = createFileRoute("/crm/email-sms")({
  component: () => <CrmPage page="email-sms" />,
});
