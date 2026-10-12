import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/features/crm/CrmPage";
export const Route = createFileRoute("/crm/social-leads")({
  component: () => <CrmPage page="social-leads" />,
});
