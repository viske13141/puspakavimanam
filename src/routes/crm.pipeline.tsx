import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/features/crm/CrmPage";
export const Route = createFileRoute("/crm/pipeline")({
  component: () => <CrmPage page="pipeline" />,
});
