import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/features/crm/CrmPage";
export const Route = createFileRoute("/crm/campaigns")({
  component: () => <CrmPage page="campaigns" />,
});
