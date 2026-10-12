import { createFileRoute } from "@tanstack/react-router";
import { OperatorPage } from "@/features/operator/OperatorPage";
export const Route = createFileRoute("/operator/crew")({
  component: () => <OperatorPage page="crew" />,
});
