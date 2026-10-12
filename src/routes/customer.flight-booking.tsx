import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AircraftBookingFlow } from "@/components/inquiry/AircraftBookingFlow";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { customerNav } from "@/lib/portal-nav";

export const Route = createFileRoute("/customer/flight-booking")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["draftId"] === "string" ? { draftId: search["draftId"] } : {}),
    ...(search["startNew"] === true || search["startNew"] === "true" ? { startNew: true } : {}),
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") await requireRoleAccess(["CUSTOMER"]);
  },
  component: CustomerFlightBooking,
});

function CustomerFlightBooking() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { draftId, startNew } = Route.useSearch();
  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }
  return (
    <PortalShell
      title="Continue your flight booking"
      nav={customerNav}
      onLogout={() => void handleLogout()}
    >
      <AircraftBookingFlow profile={profile} draftId={draftId} startNew={startNew ?? false} />
    </PortalShell>
  );
}
