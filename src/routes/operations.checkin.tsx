import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "@/features/operations/OperationsPage";
export const Route = createFileRoute("/operations/checkin")({
  component: () => <OperationsPage page="checkin" />,
});
