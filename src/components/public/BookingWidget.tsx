import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { saveAircraftSelection } from "@/lib/aircraft-booking-service";
import { useAuth } from "@/lib/auth";

const currencies = ["EUR", "USD", "GBP", "AED", "INR"] as const;
type Currency = (typeof currencies)[number];

export function BookingWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kind, setKind] = useState<"flight" | "helicopter" | "">("");
  const [pax, setPax] = useState(2);
  const [budget, setBudget] = useState(30000);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [error, setError] = useState("");

  function handleContinue() {
    if (!kind) { setError("Please select an aircraft type."); return; }
    setError("");
    try {
      saveAircraftSelection({
        aircraft_type: kind as "flight" | "helicopter",
        passenger_count: pax,
        budget,
        currency,
      });
    } catch {
      setError("Unable to save selection. Please try again.");
      return;
    }
    if (!user) {
      void navigate({ to: "/login" });
    } else {
      void navigate({ to: "/customer/flight-booking" });
    }
  }

  return (
    <section className="relative z-10 -mt-24 px-4 pb-0 md:px-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white shadow-[0_8px_60px_-12px_rgba(20,38,61,0.18)] border border-[#E5E9EF]"
        >
          <div className="border-b border-[#E5E9EF] px-6 py-4 md:px-8">
            <p className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-[#B79A65] uppercase">
              Quick Booking
            </p>
          </div>

          <div className="grid gap-0 md:grid-cols-4">
            {/* Aircraft Type */}
            <div className="border-b border-[#E5E9EF] p-6 md:border-b-0 md:border-r md:p-8">
              <label className="mb-3 block font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#596579] uppercase">
                Aircraft Type
              </label>
              <div className="flex flex-col gap-2">
                {(["helicopter", "flight"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => { setKind(k); setError(""); }}
                    className={`border px-4 py-2.5 text-left font-sans text-sm transition-all ${
                      kind === k
                        ? "border-[#14263D] bg-[#14263D] text-white"
                        : "border-[#E5E9EF] text-[#596579] hover:border-[#14263D] hover:text-[#14263D]"
                    }`}
                  >
                    {k === "helicopter" ? "Helicopter" : "Private Jet"}
                  </button>
                ))}
              </div>
            </div>

            {/* Passengers */}
            <div className="border-b border-[#E5E9EF] p-6 md:border-b-0 md:border-r md:p-8">
              <label className="mb-3 block font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#596579] uppercase">
                Passengers
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPax((v) => Math.max(1, v - 1))}
                  className="flex h-9 w-9 items-center justify-center border border-[#E5E9EF] text-[#14263D] transition-colors hover:border-[#14263D]"
                >
                  −
                </button>
                <span className="font-serif text-4xl font-light text-[#14263D]">{pax}</span>
                <button
                  type="button"
                  onClick={() => setPax((v) => Math.min(50, v + 1))}
                  className="flex h-9 w-9 items-center justify-center border border-[#E5E9EF] text-[#14263D] transition-colors hover:border-[#14263D]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Budget */}
            <div className="border-b border-[#E5E9EF] p-6 md:border-b-0 md:border-r md:p-8">
              <label className="mb-3 block font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#596579] uppercase">
                Estimated Budget
              </label>
              <div className="font-serif text-2xl font-light text-[#14263D]">
                {currency} {budget.toLocaleString()}
              </div>
              <input
                type="range"
                min={5000}
                max={200000}
                step={5000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-3 h-0.5 w-full cursor-pointer appearance-none accent-[#B79A65]"
                style={{
                  background: `linear-gradient(90deg,#B79A65 ${((budget - 5000) / 195000) * 100}%,#E5E9EF ${((budget - 5000) / 195000) * 100}%)`,
                }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currencies.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`border px-2 py-0.5 font-sans text-[0.6rem] tracking-[0.1em] transition-colors ${
                      currency === c
                        ? "border-[#14263D] bg-[#14263D] text-white"
                        : "border-[#E5E9EF] text-[#596579] hover:border-[#596579]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col justify-between p-6 md:p-8">
              {error && (
                <p className="mb-3 font-sans text-xs text-red-500">{error}</p>
              )}
              <div className="mt-auto">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full bg-[#14263D] px-6 py-4 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-white transition-all duration-300 hover:bg-[#B79A65]"
                >
                  CONTINUE BOOKING →
                </button>
                <p className="mt-3 font-sans text-[0.65rem] text-[#596579]">
                  No commitment. Our team will confirm availability.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
