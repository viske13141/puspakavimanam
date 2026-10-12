import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "@/features/operations/OperationsPage";
export const Route = createFileRoute("/operations/incidents")({
  component: () => <OperationsPage page="incidents" />,
});
