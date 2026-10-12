import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/features/crm/CrmPage";
export const Route = createFileRoute("/crm/website-leads")({
  component: () => <CrmPage page="website-leads" />,
});
