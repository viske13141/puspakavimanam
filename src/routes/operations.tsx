import { createFileRoute } from "@tanstack/react-router";
import { requireRoleAccess } from "@/lib/auth";
import { AviationLayout } from "@/features/aviation/layout";
import { Loading } from "@/features/aviation/ui";
export const Route = createFileRoute("/operations")({
  beforeLoad: () => requireRoleAccess(["OPERATIONS"]),
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" ? { q: search["q"] } : {},
  pendingComponent: Loading,
  component: () => <AviationLayout mode="operations" />,
});
