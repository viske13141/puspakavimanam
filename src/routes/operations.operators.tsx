import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "@/features/operations/OperationsPage";
export const Route = createFileRoute("/operations/operators")({
  component: () => <OperationsPage page="operators" />,
});
