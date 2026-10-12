import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { requireRoleAccess } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { listCustomerRequests } from "@/lib/request-service";
import { customerNav as nav } from "@/lib/portal-nav";
import { supabase } from "@/integrations/supabase/client";

type RequestRecord = {
  id: string;
  request_number: string;
  service_type: string;
  destination: string | null;
  people_count: number;
  start_date: string | null;
  created_at: string;
  status: string;
  request_mode?: string;
  customer_details?: { name?: string } | null;
};

function statusColor(status: string) {
  if (status === "BOOKED" || status === "COMPLETED") return "border-green-300/40 text-green-200";
  if (status === "CANCELLED") return "border-red-300/40 text-red-200";
  if (status === "DRAFT") return "border-ivory/20 text-ivory/40";
  return "border-champagne/40 text-champagne";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted — awaiting review",
    UNDER_REVIEW: "Under review",
    SALES_CONTACTED: "Sales has contacted you",
    OPTIONS_FOUND: "Options found",
    QUOTE_SENT: "Quote sent — check your email",
    BOOKED: "Confirmed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

export const Route = createFileRoute("/customer/requests")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") await requireRoleAccess(["CUSTOMER"]);
  },
  component: CustomerRequests,
});

function CustomerRequests() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/customer/requests") return <Outlet />;
  return <CustomerEnquiries />;
}

function CustomerEnquiries() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void listCustomerRequests()
      .then((data) => {
        // Show only ENQUIRY mode (not bookings — those live on /customer/bookings)
        const enquiries = (data as RequestRecord[]).filter(
          (r) => String(r.request_mode ?? "ENQUIRY") === "ENQUIRY",
        );
        setRequests(enquiries);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load requests."));

    const channel = supabase
      .channel("customer-requests-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" }, () => {
        void listCustomerRequests()
          .then((data) =>
            setRequests(
              (data as RequestRecord[]).filter(
                (r) => String(r.request_mode ?? "ENQUIRY") === "ENQUIRY",
              ),
            ),
          )
          .catch(() => {});
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <PortalShell title="My enquiries" nav={nav}>
      {error && <p className="mb-4 border border-red-300/30 p-4 text-sm text-red-100">{error}</p>}
      {!error && !requests.length && (
        <p className="border border-dashed border-white/15 p-10 text-center text-sm text-ivory/50">
          No enquiries yet. Submit a request from the home page to get started.
        </p>
      )}
      <div className="space-y-3">
        {requests.map((request) => {
          const customer = request.customer_details;
          return (
            <article
              key={String(request.id)}
              className="border border-ivory/10 bg-white/[0.02] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="whisper text-champagne">
                    {String(request.request_number)} · ENQUIRY
                  </p>
                  <p className="mt-2 font-serif text-2xl text-ivory">
                    {String(request.service_type)}
                  </p>
                  <p className="mt-1 text-sm text-ivory/50">
                    {String(request.destination ?? "Destination TBC")} ·{" "}
                    {String(request.people_count)} pax
                  </p>
                  <p className="mt-1 text-xs text-ivory/35">
                    {String(request.start_date ?? "Date TBC")} · Submitted{" "}
                    {new Date(String(request.created_at)).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`border px-3 py-1 whisper text-[0.58rem] ${statusColor(String(request.status))}`}
                  >
                    {String(request.status)}
                  </span>
                  <span className="text-xs text-ivory/40">
                    {statusLabel(String(request.status))}
                  </span>
                </div>
              </div>
              {customer?.name && (
                <p className="mt-3 text-xs text-ivory/35">Submitted for {String(customer.name)}</p>
              )}
              <p className="mt-3 text-xs text-ivory/40">
                Status updates from the sales desk appear here automatically.
              </p>
            </article>
          );
        })}
      </div>
    </PortalShell>
  );
}
