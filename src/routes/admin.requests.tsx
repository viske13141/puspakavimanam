import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { listStaffRequests } from "@/lib/request-service";
import { adminNav } from "@/lib/portal-nav";
import { PassengerCompliancePanel } from "@/components/inquiry/PassengerCompliancePanel";
import { BookingPnrSearch } from "@/components/inquiry/BookingPnrSearch";
import { EventRequestDetails } from "@/components/inquiry/EventRequestDetails";
export const Route = createFileRoute("/admin/requests")({
  beforeLoad: () => {
    if (typeof window !== "undefined") return requireRoleAccess(["ADMIN"]);
  },
  component: AdminRequests,
});
function AdminRequests() {
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void listStaffRequests()
      .then((data) => setRequests(data as Array<Record<string, unknown>>))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load requests."));
  }, []);
  return (
    <PortalShell title="All requests" nav={adminNav}>
      <BookingPnrSearch />
      {error && <p className="border border-red-300/30 p-4 text-red-100">{error}</p>}
      {!error && !requests.length && (
        <p className="border border-dashed border-white/15 p-10 text-center text-ivory/50">
          No requests found.
        </p>
      )}
      <div className="space-y-3">
        {requests.map((request) => {
          const entitlement = request.customer_entitlement as Record<string, unknown> | null;
          const details = request.customer_details as Record<string, unknown> | null;
          const isEventRequest = request["service_type"] === "EVENT_AVIATION";
          return (
            <article key={String(request.id)} className="border border-white/10 p-5">
              <div className="flex justify-between">
                <div>
                  <p className="whisper text-champagne">{String(request.request_number)}</p>
                  <p className="mt-2 font-serif text-2xl">{String(request.service_type)}</p>
                  <p className="mt-1 text-sm text-ivory/50">
                    Customer {String(details?.name ?? request.customer_id)} ·{" "}
                    {String(details?.email ?? "—")} · {String(details?.mobile ?? "—")}
                  </p>
                </div>
                <span className="text-xs text-champagne">{String(request.status)}</span>
              </div>
              <p className="mt-4 border-t border-white/10 pt-3 text-xs text-ivory/50">
                {String(request.destination ?? "Pending destination")} · Documents:{" "}
                {details?.identity_doc ? "Identity uploaded" : "No identity document"} · Mode:{" "}
                {String(request.request_mode ?? "ENQUIRY")} · Access:{" "}
                {entitlement?.subscription_status === "ACTIVE"
                  ? `Subscription ${String(entitlement.subscription_plan ?? "active")}`
                  : `${String(entitlement?.credits_remaining ?? 0)} credits`}
              </p>
              {isEventRequest && (
                <details className="mt-4 border-t border-white/10 pt-4">
                  <summary className="cursor-pointer whisper text-champagne">
                    REVIEW EVENT & AVIATION REQUIREMENTS
                  </summary>
                  <div className="mt-4">
                    <EventRequestDetails serviceDetails={request["service_details"]} />
                  </div>
                  {request["additional_requirements"] && (
                    <p className="mt-4 whitespace-pre-wrap border border-white/10 p-4 text-sm text-ivory/65">
                      {String(request["additional_requirements"])}
                    </p>
                  )}
                </details>
              )}
              <PassengerCompliancePanel requestId={String(request.id)} canReview />
            </article>
          );
        })}
      </div>
    </PortalShell>
  );
}
