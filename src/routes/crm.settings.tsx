import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/features/crm/CrmPage";
export const Route = createFileRoute("/crm/settings")({
  component: () => <CrmPage page="settings" />,
});
