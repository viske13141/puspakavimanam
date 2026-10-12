import { createFileRoute } from "@tanstack/react-router";
import { CrmLayout } from "@/features/crm/layout";
export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "Viman CRM | Aviation relationships, elevated" }] }),
  component: CrmLayout,
});
