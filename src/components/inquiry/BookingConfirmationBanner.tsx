import { useEffect, useState } from "react";
import { getBookingForRequest, type BookingRecord } from "@/lib/booking-compliance-service";

export function BookingConfirmationBanner({ requestId }: { requestId: string }) {
  const [booking, setBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    let active = true;
    void getBookingForRequest(requestId)
      .then((record) => {
        if (active) setBooking(record);
      })
      .catch(() => {
        if (active) setBooking(null);
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  if (!booking) return null;

  return (
    <section className="mt-4 border border-champagne/25 bg-champagne/[0.04] p-4">
      <p className="whisper text-champagne">BOOKING CONFIRMED</p>
      <div className="mt-3 grid gap-3 text-sm text-ivory/65 sm:grid-cols-2">
        <p>
          PNR: <strong className="text-champagne">{booking.pnr}</strong>
        </p>
        <p>
          Sector: {booking.departure ?? "To be confirmed"} →{" "}
          {booking.destination ?? "To be confirmed"}
        </p>
        <p>Travel date: {booking.travel_date ?? "To be confirmed"}</p>
        <p>Status: {booking.booking_status}</p>
      </div>
      <p className="mt-3 text-xs text-ivory/40">
        Passenger e-tickets are available from each confirmed passenger record.
      </p>
    </section>
  );
}
