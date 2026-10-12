import { createFileRoute } from "@tanstack/react-router";
import { OperatorPage } from "@/features/operator/OperatorPage";
export const Route = createFileRoute("/operator/incidents")({
  component: () => <OperatorPage page="incidents" />,
});
