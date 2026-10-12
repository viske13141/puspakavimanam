import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { brand, scenes } from "@/content/site";
import { ease, useCinematicMotion } from "@/components/scene/motion";
import { type AircraftKind } from "./aircraftInventory";
import { matchAircraft, type AircraftMatch } from "./flightMatcher";
import { inquiryConfig, type InquiryContext } from "./inquiryConfig";
import { InquiryProgress } from "./InquiryProgress";
import { InquiryStep } from "./InquiryStep";
import { supabase } from "@/integrations/supabase/client";
import { type Service } from "./VoiceConcierge";
import { dashboardForRole, useAuth } from "@/lib/auth";
import { saveAircraftSelection, readAircraftSelection } from "@/lib/aircraft-booking-service";

const STORAGE_KEY = "hj_home_draft";
type Draft = { service: Service | null; travellers: number; budget: number; currency: string };
type Entitlement = { customer_id: string; subscription_status: "NONE" | "ACTIVE" | "PAUSED" | "EXPIRED"; subscription_plan: string | null; credits_remaining: number; updated_at: string };
function saveDraft(d: Draft) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { /* ignore */ } }
type AuthMode = "choose" | "login" | "register";

function EmbeddedJourneyCard() {
  const { reduced } = useCinematicMotion();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [step, setStep] = useState(0);
  const [service, setService] = useState<Service | null>(null);
  const [travellers, setTravellers] = useState(2);
  const [budget, setBudget] = useState(30000);
  const [currency, setCurrency] = useState("EUR");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("choose");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bName, setBName] = useState("");
  const [bMobile, setBMobile] = useState("");
  const [bEmail, setBEmail] = useState("");
  const [bFiles, setBFiles] = useState<File[]>([]);
  const [bError, setBError] = useState("");
  const [bPending, setBPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [entitlementLoading, setEntitlementLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!entitlement?.customer_id) return;
    const channel = supabase.channel(`customer-entitlement-${entitlement.customer_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_entitlements", filter: `customer_id=eq.${entitlement.customer_id}` }, (payload) => {
        if (payload.new) setEntitlement(payload.new as Entitlement);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [entitlement?.customer_id]);

  const [aviationKind, setAviationKind] = useState<"flight" | "helicopter" | null>(null);
  const [dbAircraft, setDbAircraft] = useState<{ id: string; kind: string; model: string; capacity: string }[]>([]);
  const [acSearch, setAcSearch] = useState("");
  const [acSelected, setAcSelected] = useState<string | null>(null);

  useEffect(() => {
    const selection = readAircraftSelection();
    if (!selection) return;
    setService("AVIATION");
    setAviationKind(selection.aircraft_type);
    setTravellers(selection.passenger_count);
    setBudget(selection.budget);
    setCurrency(selection.currency);
    setStep(3);
  }, []);

  useEffect(() => {
    if (aviationKind) {
      void supabase.from("aircraft").select("id,kind,model,capacity").eq("kind", aviationKind).order("model")
        .then(({ data }) => setDbAircraft(data ?? []));
    }
  }, [aviationKind]);

  const serviceOptions: Service[] = ["AVIATION", "MOBILITY", "YACHTS", "RESIDENCES", "CONCIERGE", "EXPERIENCES"];
  const serviceDesc: Record<Service, string> = {
    AVIATION: "Private Jets & Helicopters",
    MOBILITY: "Luxury Cars & Chauffeurs",
    YACHTS: "Yacht Charter & Marine Experiences",
    RESIDENCES: "Villas, Hotels & Private Stays",
    CONCIERGE: "Personal Assistance",
    EXPERIENCES: "Curated Moments & Lasting Memories",
  };
  // When AVIATION is selected, insert an extra sub-step between TYPE and PEOPLE
  const stepLabels = service === "AVIATION" ? ["TYPE", "AIRCRAFT", "PEOPLE", "BUDGET"] : ["TYPE", "PEOPLE", "BUDGET"];
  const ct = reduced ? { duration: 0 } : { duration: 0.55, ease };

  const next = () => {
    setAuthError("");
    if (step === 0 && !service) return;
    if (step === 1 && service === "AVIATION" && !aviationKind) return;
    if (step === 2 && service === "AVIATION" && acSelected) {
      const capacity = Number.parseInt(dbAircraft.find((aircraft) => aircraft.id === acSelected)?.capacity ?? "", 10);
      if (Number.isFinite(capacity) && travellers > capacity) {
        setAuthError(`This aircraft accommodates up to ${capacity} passengers.`);
        return;
      }
    }
    if (step < stepLabels.length - 1) { setStep((v) => v + 1); return; }
    if (service === "AVIATION") {
      if (!aviationKind || !Number.isInteger(travellers) || travellers < 1 || budget <= 0) return;
      try {
        const selectedModel = dbAircraft.find((aircraft) => aircraft.id === acSelected)?.model;
        saveAircraftSelection({
          aircraft_type: aviationKind,
          passenger_count: travellers,
          budget,
          currency,
          ...(selectedModel ? { aircraft_preference: selectedModel } : {}),
        });
      } catch {
        setAuthError("Unable to save your flight selection in this browser. Check available storage and try again.");
        return;
      }
      if (!user) {
        void navigate({ to: "/login" });
      } else if (role && role !== "CUSTOMER") {
        void navigate({ to: dashboardForRole(role) });
      } else {
        void navigate({ to: "/customer/flight-booking" });
      }
      return;
    }
    saveDraft({ service, travellers, budget, currency });
    setShowAuth(true);
  };
  const back = () => {
    if (step === 0) return;
    if (step === 1 && service === "AVIATION") { setAviationKind(null); setAcSelected(null); setAcSearch(""); }
    setStep((v) => Math.max(0, v - 1));
  };

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setAuthError(""); setAuthPending(true);
    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw new Error("Invalid email or password.");
      } else {
        if (authPassword !== authConfirm) throw new Error("Passwords do not match.");
        if (authPassword.length < 8) throw new Error("Password must be at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw new Error(error.message);
        if (!data.session) throw new Error("Please confirm your email then return here.");
      }
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error("Session expired. Please sign in again.");
      setEntitlementLoading(true);
      const { data: entitlementRow, error: entitlementError } = await supabase.from("customer_entitlements").select("*").eq("customer_id", authUser.user.id).maybeSingle();
      if (entitlementError) throw entitlementError;
      setEntitlement((entitlementRow as Entitlement | null) ?? null);
      setEntitlementLoading(false);
      setBEmail(authEmail);
      setShowAuth(false);
      setShowBooking(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
      setEntitlementLoading(false);
    } finally { setAuthPending(false); }
  }

  async function handleBookingSubmit(e: FormEvent) {
    e.preventDefault();
    setBError("");
    if (service === "AVIATION") {
      next();
      return;
    }
    if (!bName.trim()) return setBError("Enter your full name.");
    if (!bMobile.trim()) return setBError("Enter your mobile number.");
    if (!bEmail.trim()) return setBError("Enter your email.");
    setBPending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Session expired. Please sign in again.");
      let docPath: string | null = null;
      if (bFiles[0]) {
        const ext = bFiles[0].name.split(".").pop();
        const path = `identity/${auth.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("request-documents").upload(path, bFiles[0]);
        if (upErr) throw new Error("Upload failed: " + upErr.message);
        docPath = path;
      }
      const { data: num, error: numErr } = await supabase.rpc("next_request_number");
      if (numErr) throw numErr;
      const { error: insErr } = await supabase.from("requests").insert({
        request_number: num,
        customer_id: auth.user.id,
        service_type: service ?? "GENERAL",
        status: "SUBMITTED",
        request_mode: entitlement?.subscription_status === "ACTIVE" ? "BOOKING" : "ENQUIRY",
        entitlement_snapshot: entitlement ? { subscription_status: entitlement.subscription_status, subscription_plan: entitlement.subscription_plan, credits_remaining: entitlement.credits_remaining } : {},
        people_count: travellers,
        budget,
        currency,
        customer_details: { name: bName, email: bEmail, mobile: bMobile, identity_doc: docPath },
        service_details: {
          source: "home_planner",
          aircraft_model: dbAircraft.find((aircraft) => aircraft.id === acSelected)?.model ?? null,
          aircraft_kind: aviationKind,
          travellers,
        },
      });
      if (insErr) throw insErr;
      if (entitlement?.subscription_status !== "ACTIVE" && entitlement?.credits_remaining) {
        await supabase.rpc("consume_customer_credit");
        setEntitlement((current) => current ? { ...current, credits_remaining: Math.max(0, current.credits_remaining - 1) } : current);
      }
      localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
    } catch (err) {
      setBError(err instanceof Error ? err.message : "Submission failed.");
    } finally { setBPending(false); }
  }

  return (
    <>
      <motion.aside
        role="region" aria-label="HELITEJET journey planner"
        initial={reduced ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease }}
        className="flex h-[480px] w-full flex-col border border-ivory/15 bg-[oklch(0.09_0.008_275/0.84)] p-5 shadow-[0_30px_100px_-50px_rgba(0,0,0,0.95)] backdrop-blur-md md:h-[500px] md:p-6"
      >
        <div className={`grid gap-2 border-b border-ivory/10 pb-4 ${stepLabels.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
          {stepLabels.map((label, i) => (
            <button key={label} type="button" disabled={i > step} onClick={() => setStep(i)}
              className={`text-left whisper text-[0.52rem] tracking-[0.12em] transition-colors ${i === step ? "text-champagne" : i < step ? "text-ivory/70" : "text-ivory/30"}`}>
              {String(i + 1).padStart(2, "0")} {label}
            </button>
          ))}
        </div>
        <div className="border-b border-ivory/10 py-3 text-center text-[0.6rem] tracking-[0.12em] text-ivory/40">
          {service === "AVIATION" ? "CHARTER REQUEST · AIRCRAFT AVAILABILITY SUBJECT TO CONFIRMATION" : "SUBSCRIPTION = BOOK FLIGHTS · CREDITS = SEND ENQUIRY"}
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          {authError && !showAuth && <p role="alert" className="mt-3 border border-red-300/30 px-3 py-2 text-xs text-red-100">{authError}</p>}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step}
              initial={reduced ? false : { opacity: 0, x: 18, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -18, filter: "blur(8px)" }}
              transition={ct} className="flex flex-1 flex-col pt-6">
              <h2 className="text-center font-serif text-xl font-light text-ivory/80">
                {step === 0 ? "What are you looking for?"
                  : (step === 1 && service === "AVIATION") ? "Flight or Helicopter?"
                  : (step === stepLabels.length - 1) ? "Preferred budget"
                  : "How many travellers?"}
              </h2>
              <div className="mt-5 flex flex-1 flex-col justify-start">
                {step === 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {serviceOptions.map((opt) => (
                      <button key={opt} type="button" onClick={() => { setService(opt); setAviationKind(null); }} aria-pressed={service === opt}
                        className={`border px-3 py-3 text-left font-serif text-sm transition-colors ${service === opt ? "border-champagne/80 bg-champagne/[0.08] text-ivory" : "border-ivory/10 text-ivory/55 hover:border-ivory/30 hover:text-ivory"}`}>
                        <span className="block">{opt}</span>
                        <span className="mt-1 block text-[0.62rem] text-ivory/35">{serviceDesc[opt]}</span>
                      </button>
                    ))}
                  </div>
                )}
                {step === 1 && service === "AVIATION" && (
                  <div className="flex flex-1 flex-col gap-3">
                    {!aviationKind ? (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {(["flight", "helicopter"] as const).map((kind) => (
                          <button key={kind} type="button" onClick={() => { setAviationKind(kind); setAcSelected(null); setAcSearch(""); }}
                            className="border border-ivory/10 px-4 py-6 text-left font-serif transition-colors hover:border-ivory/30 hover:text-ivory text-ivory/55">
                            <span className="block text-lg">{kind === "flight" ? "Flight" : "Helicopter"}</span>
                            <span className="mt-2 block text-[0.62rem] text-ivory/35">{kind === "flight" ? "Fixed-wing private aircraft" : "Rotorcraft & charter"}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="whisper text-[0.6rem] border border-champagne/40 text-champagne px-2 py-0.5">{aviationKind === "flight" ? "FLIGHT" : "HELICOPTER"}</span>
                          <button type="button" onClick={() => { setAviationKind(null); setAcSelected(null); }} className="whisper text-[0.6rem] text-ivory/30 hover:text-champagne">CHANGE</button>
                        </div>
                        <input value={acSearch} onChange={(e) => setAcSearch(e.target.value)} placeholder="Search model…"
                          className="border border-ivory/15 bg-transparent px-3 py-1.5 text-sm text-ivory outline-none placeholder:text-ivory/30 focus:border-champagne/60" />
                        <div className="flex-1 overflow-y-auto space-y-1 max-h-40 [scrollbar-width:thin] [scrollbar-color:var(--color-gold)_transparent]">
                          {dbAircraft.filter(a => !acSearch || a.model.toLowerCase().includes(acSearch.toLowerCase())).map((a) => (
                            <button key={a.id} type="button" onClick={() => setAcSelected(a.id)}
                              className={`flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition-colors ${acSelected === a.id ? "border-champagne/80 bg-champagne/[0.08]" : "border-ivory/10 hover:border-ivory/30"}`}>
                              <span className="font-serif text-sm text-ivory">{a.model}</span>
                              <span className="whisper text-[0.6rem] text-ivory/50">{a.capacity}</span>
                            </button>
                          ))}
                          {dbAircraft.length === 0 && <p className="py-4 text-center text-xs text-ivory/30 italic">No {aviationKind}s in fleet yet.</p>}
                        </div>
                          {acSelected ? <p className="whisper text-[0.6rem] text-champagne border-t border-ivory/10 pt-2">SELECTED: {dbAircraft.find(a => a.id === acSelected)?.model}</p> : <p className="text-xs text-ivory/35">Aircraft preference is optional; our team will confirm availability.</p>}
                      </div>
                    )}
                  </div>
                )}
                {((step === 1 && service !== "AVIATION") || (step === 2 && service === "AVIATION")) && (
                  <div className="flex items-center justify-center gap-8 pt-5">
                    <button type="button" onClick={() => setTravellers((v) => Math.max(1, v - 1))}
                      className="flex h-10 w-10 items-center justify-center border border-ivory/20 text-xl text-ivory/70 transition-colors hover:border-champagne hover:text-champagne">−</button>
                    <span className="font-serif text-5xl font-light text-ivory">{travellers}</span>
                    <button type="button" onClick={() => setTravellers((v) => Math.min(50, v + 1))}
                      className="flex h-10 w-10 items-center justify-center border border-ivory/20 text-xl text-ivory/70 transition-colors hover:border-champagne hover:text-champagne">+</button>
                  </div>
                )}
                {((step === 2 && service !== "AVIATION") || (step === 3 && service === "AVIATION")) && (
                  <div className="pt-3">
                    <div className="text-center font-serif text-4xl font-light text-ivory">{currency} {budget.toLocaleString()}</div>
                    <input type="range" min="10000" max="150000" step="5000" value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="mt-10 h-1 w-full cursor-pointer appearance-none accent-champagne"
                      style={{ background: `linear-gradient(90deg,oklch(0.72 0.1 80) ${((budget - 10000) / 140000) * 100}%,oklch(0.94 0.014 85/0.18) ${((budget - 10000) / 140000) * 100}%)` }}
                    />
                    <div className="mt-3 flex justify-between whisper text-ivory/35"><span>{currency} 10,000</span><span>{currency} 150,000</span></div>
                    <div className="mt-4 flex justify-center gap-2">
                      {(["EUR", "USD", "GBP", "AED", "INR"] as const).map((c) => (
                        <button key={c} type="button" onClick={() => setCurrency(c)}
                          className={`border px-3 py-1 whisper text-[0.55rem] transition-colors ${currency === c ? "border-champagne text-champagne" : "border-ivory/20 text-ivory/40 hover:border-ivory/50"}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-ivory/10 pt-4">
          <button type="button" onClick={back} disabled={step === 0}
            className="whisper text-ivory/55 transition-colors hover:text-champagne disabled:invisible">← BACK</button>
          <button type="button" onClick={next} disabled={(step === 0 && !service) || (step === 1 && service === "AVIATION" && !aviationKind)}
            className="group inline-flex items-center gap-3 whisper text-champagne transition-colors hover:text-ivory disabled:opacity-40">
            <span>{step === stepLabels.length - 1 ? service === "AVIATION" ? "CONTINUE BOOKING" : "LOGIN TO CONTINUE" : "NEXT"}</span>
            <span className="relative block h-px w-10 overflow-hidden bg-gold/50">
              <span className="absolute inset-0 origin-left scale-x-0 bg-ivory transition-transform duration-500 group-hover:scale-x-100" />
            </span>
          </button>
        </div>
      </motion.aside>

      {/* AUTH POPUP */}
      <AnimatePresence>
        {showAuth && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAuth(false)}>
            <motion.div className="w-full max-w-md border border-ivory/15 bg-[oklch(0.1_0.008_275)] p-7"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-ivory/10 pb-5">
                <div>
                  <p className="whisper text-champagne">PRIVATE PORTAL</p>
                  <h2 className="mt-2 font-serif text-3xl font-light text-ivory">
                    {authMode === "choose" ? "Continue your enquiry" : authMode === "login" ? "Sign in" : "Create account"}
                  </h2>
                </div>
                <button type="button" onClick={() => setShowAuth(false)} className="text-2xl text-ivory/50 hover:text-champagne">×</button>
              </div>
              {authMode === "choose" && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-ivory/60">Your selections have been saved. Sign in or create an account to continue.</p>
                  <button type="button" onClick={() => setAuthMode("login")}
                    className="w-full border border-champagne/40 py-3 whisper text-champagne transition-colors hover:bg-champagne/10">SIGN IN →</button>
                  <button type="button" onClick={() => setAuthMode("register")}
                    className="w-full border border-ivory/20 py-3 whisper text-ivory/60 transition-colors hover:border-ivory/50 hover:text-ivory">CREATE ACCOUNT →</button>
                </div>
              )}
              {(authMode === "login" || authMode === "register") && (
                <form onSubmit={handleAuth} className="mt-6 space-y-4">
                  {authError && <p className="border border-red-300/30 p-3 text-sm text-red-200">{authError}</p>}
                  <label className="block"><span className="whisper text-ivory/50">Email</span>
                    <input className="field" type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} autoFocus /></label>
                  <label className="block"><span className="whisper text-ivory/50">Password</span>
                    <input className="field" type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} /></label>
                  {authMode === "register" && (
                    <label className="block"><span className="whisper text-ivory/50">Confirm password</span>
                      <input className="field" type="password" required value={authConfirm} onChange={(e) => setAuthConfirm(e.target.value)} /></label>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <button type="button" onClick={() => setAuthMode("choose")} className="whisper text-ivory/40 hover:text-champagne">← BACK</button>
                    <button type="submit" disabled={authPending} className="whisper text-champagne hover:text-ivory disabled:opacity-50">
                      {authPending ? "PLEASE WAIT…" : authMode === "login" ? "SIGN IN →" : "CREATE & CONTINUE →"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOOKING DETAILS POPUP */}
      <AnimatePresence>
        {showBooking && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-lg border border-ivory/15 bg-[oklch(0.1_0.008_275)] p-7"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              {submitted ? (
                <div className="space-y-4 py-6 text-center">
                  <p className="whisper text-champagne">REQUEST RECEIVED</p>
                  <h2 className="font-serif text-4xl font-light text-ivory">We will be in touch.</h2>
                  <p className="text-sm text-ivory/60">Our concierge team will review your requirements and reach out within the hour.</p>
                  <button type="button" onClick={() => void navigate({ to: "/customer/dashboard", replace: true })}
                    className="mt-4 whisper text-champagne hover:text-ivory">VIEW MY PORTAL →</button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between border-b border-ivory/10 pb-5">
                    <div>
                      <p className="whisper text-champagne">BOOKING DETAILS</p>
                      <h2 className="mt-2 font-serif text-3xl font-light text-ivory">Complete your request</h2>
                      <p className="mt-1 text-xs text-ivory/40">{service} · {travellers} people · {currency} {budget.toLocaleString()}</p>
                    </div>
                  </div>
                  {entitlementLoading ? <p className="mt-6 text-sm text-ivory/60">Checking your subscription and credits...</p> : !entitlement || (entitlement.subscription_status !== "ACTIVE" && entitlement.credits_remaining <= 0) ? (
                    <div className="mt-6 space-y-4 border border-champagne/25 bg-champagne/[0.04] p-5">
                      <p className="whisper text-champagne">ONE STEP BEFORE CONTINUING</p>
                      <p className="font-serif text-xl text-ivory">Choose a subscription to book flights, or credits to send an enquiry.</p>
                      <p className="text-sm text-ivory/55">Your live account entitlement will appear here as soon as it is activated.</p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <a href="/subscriptions#plans" className="border border-champagne/50 px-4 py-2 whisper text-champagne">VIEW SUBSCRIPTIONS →</a>
                        <a href="/subscriptions#credits" className="border border-ivory/20 px-4 py-2 whisper text-ivory/60">VIEW CREDIT OPTIONS →</a>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} className="mt-6 space-y-4">
                    <div className="border border-champagne/20 bg-champagne/[0.04] p-3 text-sm text-ivory/65">
                      <span className="whisper text-champagne">{entitlement.subscription_status === "ACTIVE" ? "SUBSCRIPTION ACTIVE · BOOKING ENABLED" : `CREDITS AVAILABLE · ${entitlement.credits_remaining} REMAINING · ENQUIRY MODE`}</span>
                    </div>
                    {bError && <p className="border border-red-300/30 p-3 text-sm text-red-200">{bError}</p>}
                    <label className="block"><span className="whisper text-ivory/50">Full name</span>
                      <input className="field" value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Your full name" required /></label>
                    <label className="block"><span className="whisper text-ivory/50">Mobile number</span>
                      <input className="field" type="tel" value={bMobile} onChange={(e) => setBMobile(e.target.value)} placeholder="+44 7700 000000" required /></label>
                    <label className="block"><span className="whisper text-ivory/50">Email</span>
                      <input className="field" type="email" value={bEmail} onChange={(e) => setBEmail(e.target.value)} required /></label>
                    <label className="block">
                      <span className="whisper text-ivory/50">Identity document <span className="text-ivory/30">(optional)</span></span>
                      <div className="mt-1 flex items-center gap-3">
                        <button type="button" onClick={() => fileRef.current?.click()}
                          className="border border-ivory/20 px-4 py-2 whisper text-ivory/60 transition-colors hover:border-champagne hover:text-champagne">
                          {bFiles[0] ? bFiles[0].name : "UPLOAD DOC / IMAGE"}
                        </button>
                        {bFiles[0] && <button type="button" onClick={() => setBFiles([])} className="text-ivory/30 hover:text-red-300">×</button>}
                      </div>
                      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setBFiles(Array.from(e.target.files ?? []).slice(0, 1))} />
                      <p className="mt-1 text-xs text-ivory/30">JPG, PNG or PDF · max 10 MB</p>
                    </label>
                    <div className="flex items-center justify-between border-t border-ivory/10 pt-4">
                      <button type="button" onClick={() => { setShowBooking(false); setShowAuth(true); setAuthMode("choose"); }}
                        className="whisper text-ivory/40 hover:text-champagne">← BACK</button>
                      <button type="submit" disabled={bPending} className="whisper text-champagne hover:text-ivory disabled:opacity-50">
                        {bPending ? "SUBMITTING…" : entitlement.subscription_status === "ACTIVE" ? "SUBMIT BOOKING →" : "SEND ENQUIRY →"}
                      </button>
                    </div>
                  </form>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function JourneyPlanner({
  context,
  open = true,
  onClose,
  embedded = false,
}: {
  context: InquiryContext;
  open?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const { reduced } = useCinematicMotion();
  const config = inquiryConfig[context];
  const [currentStep, setCurrentStep] = useState(0);
  const [travellers, setTravellers] = useState<number | null>(context === "flights" ? 4 : 6);
  const [distance, setDistance] = useState<string | null>(context === "flights" ? "regional" : "coastal");
  const [budget, setBudget] = useState(25000);
  const [aircraftKind, setAircraftKind] = useState<AircraftKind | null>(null);
  const [aircraftQuery, setAircraftQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [selectedAircraft, setSelectedAircraft] = useState<InventoryAircraft | null>(null);
  const [showResults, setShowResults] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const canClose = !embedded && !!onClose;

  useEffect(() => {
    if (!open || embedded) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const w = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (w > 0) document.body.style.paddingRight = `${w}px`;
    return () => { document.body.style.overflow = prevOverflow; document.body.style.paddingRight = prevPadding; };
  }, [open, embedded]);

  useEffect(() => {
    if (!open || embedded) return;
    closeRef.current?.focus({ preventScroll: true });
    const sel = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose?.(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(sel)).filter((el) => !el.hasAttribute("disabled"));
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0]; const last = els[els.length - 1]; const cur = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (cur === first || !panelRef.current.contains(cur))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (cur === last || !panelRef.current.contains(cur))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, embedded]);

  useEffect(() => {
    if (!open && !embedded) {
      setCurrentStep(0); setShowResults(false);
      setTravellers(context === "flights" ? 4 : 6);
      setDistance(context === "flights" ? "regional" : "coastal");
      setBudget(25000); setAircraftKind(null); setAircraftQuery(""); setCapacityFilter("all"); setSelectedAircraft(null);
    }
  }, [open, context]);

  const currentStepMeta = config.steps[currentStep];
  const canProceed = currentStepMeta.id === "aircraft" ? selectedAircraft !== null : currentStepMeta.id === "people" ? travellers !== null : currentStepMeta.id === "where" ? distance !== null : true;
  const flightResults = travellers && distance ? matchAircraft({ travellers, distanceId: distance }) : [];
  const selectedAircraftCard: AircraftMatch | null = selectedAircraft
    ? { name: selectedAircraft.model, category: selectedAircraft.kind === "flight" ? "Fixed-wing aircraft" : "Rotorcraft", seats: selectedAircraft.capacity, range: "Inventory aircraft", cruise: "Concierge matched", mission: "Selected from the HELITEJET fleet inventory" }
    : null;
  const resultCards: AircraftMatch[] = context === "flights"
    ? (selectedAircraftCard ? [selectedAircraftCard] : flightResults.slice(0, 4))
    : [
        { name: "Harbour Collection", category: context === "yachts" ? "Explorer Yacht" : "Seaside Residence", seats: `${travellers ?? 4} guests`, range: distance ? config.distanceOptions.find((o) => o.id === distance)?.label ?? "Curated route" : "Curated route", cruise: "Private briefing", mission: context === "yachts" ? "Harbour-to-harbour charter with crew and tender" : "A stay designed for calm, privacy and daily rhythm" },
        { name: "Private Wing", category: context === "yachts" ? "Classic Yacht" : "City Residence", seats: `${travellers ?? 4} guests`, range: "Flex itinerary", cruise: "Concierge planning", mission: context === "yachts" ? "Elegant coastal passages and in-port access" : "A residence in the centre of your preferred rhythm" },
        { name: "Club Horizon", category: context === "yachts" ? "Sailing Yacht" : "Alpine Residence", seats: `${travellers ?? 4} guests`, range: "Seasonal stay", cruise: "House team", mission: context === "yachts" ? "Slow, weather-led passages and private shore days" : "Elevation, privacy, and daily rituals shaped around the landscape" },
      ];

  const handleAdvance = () => {
    if (!canProceed) return;
    if (currentStep < config.steps.length - 1) { setCurrentStep((s) => Math.min(s + 1, config.steps.length - 1)); return; }
    setShowResults(true);
  };
  const handleBack = () => {
    if (showResults) { setShowResults(false); return; }
    if (currentStep > 0) setCurrentStep((s) => Math.max(s - 1, 0));
  };

  if (embedded) return <EmbeddedJourneyCard />;
  if (!open && !embedded) return null;

  const panel = (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: 0.7, ease }}
      className="fixed inset-0 z-[80] bg-[oklch(0.07_0.006_275/0.86)] backdrop-blur-sm"
    >
      <motion.aside
        ref={panelRef} role="dialog" aria-modal="true" aria-label="Travel planning inquiry"
        initial={reduced ? false : { x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { x: 80, opacity: 0 }}
        transition={{ duration: 0.8, ease }}
        className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[820px] flex-col border-l border-ivory/10 bg-[oklch(0.11_0.008_275)] shadow-[0_0_180px_-80px_rgba(0,0,0,0.9)] md:w-[54vw]"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img src={scenes[context === "flights" ? "aviation" : context === "yachts" ? "yachts" : "residences"]} alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[2px]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.11_0.008_275/0.92),oklch(0.11_0.008_275/0.86)_40%,oklch(0.11_0.008_275/0.92))]" />
        </div>

        <div className="relative flex h-full flex-col px-5 pb-6 pt-6 md:px-9 md:pb-10 md:pt-8">
          <div className="flex items-center justify-between gap-4 border-b border-ivory/10 pb-5">
            <div className="font-serif text-2xl font-light tracking-[0.18em] text-ivory">{brand.mark}</div>
            {canClose && (
              <button ref={closeRef} type="button" onClick={onClose}
                className="whisper flex items-center gap-3 text-ivory/70 outline-none transition-colors hover:text-champagne focus-visible:text-champagne" aria-label="Close inquiry">
                <span>Close</span><span className="block h-3 w-3 border border-current" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="pt-8 md:pt-10">
            <div className="mb-6 md:mb-8">
              <InquiryProgress steps={config.steps} currentStep={showResults ? config.steps.length - 1 : currentStep}
                onSelect={(i) => { if (!showResults) setCurrentStep(Math.min(i, config.steps.length - 1)); }} />
            </div>
            <div className="flex min-h-[420px] flex-col">
              <AnimatePresence mode="wait">
                {!showResults ? (
                  <motion.div key={`step-${currentStep}`}
                    initial={reduced ? false : { opacity: 0, x: 18, filter: "blur(12px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: -18, filter: "blur(8px)" }}
                    transition={{ duration: 0.65, ease }} className="flex flex-1 flex-col">
                    <div className="mb-8 flex items-center justify-between text-ivory/50">
                      <span className="whisper text-champagne/80">{String(currentStep + 1).padStart(2, "0")}</span>
                      <span className="whisper">{String(config.steps.length).padStart(2, "0")}</span>
                    </div>
                    <div className="mb-5">
                      <div className="whisper text-champagne/80">{currentStepMeta.label}</div>
                      <h2 className="mt-4 max-w-md font-serif text-4xl font-light leading-tight text-ivory md:text-[3.3rem]">{currentStepMeta.title}</h2>
                    </div>
                    {currentStepMeta.id === "aircraft" ? (
                      <div className="flex flex-1 flex-col gap-4">
                        <div className="grid grid-cols-2 gap-2">
                          {(["flight", "helicopter"] as AircraftKind[]).map((kind) => (
                            <button key={kind} type="button" onClick={() => { setAircraftKind(kind); setSelectedAircraft(null); }}
                              className={`border px-4 py-3 text-left font-serif text-lg transition-colors ${aircraftKind === kind ? "border-champagne bg-champagne/[0.08] text-ivory" : "border-ivory/15 text-ivory/60 hover:border-ivory/40 hover:text-ivory"}`}>
                              {kind === "flight" ? "Flight" : "Helicopter"}
                              <span className="mt-1 block whisper text-ivory/35">{kind === "flight" ? "Fixed-wing aircraft" : "Rotorcraft"}</span>
                            </button>
                          ))}
                        </div>
                        {aircraftKind && (
                          <div className="flex min-h-0 flex-1 flex-col border border-ivory/10 bg-ivory/[0.02] p-3">
                            <div className="flex flex-col gap-2 md:flex-row">
                              <input value={aircraftQuery} onChange={(e) => setAircraftQuery(e.target.value)} placeholder="Search model"
                                className="min-w-0 flex-1 border border-ivory/15 bg-transparent px-3 py-2 font-serif text-sm text-ivory outline-none placeholder:text-ivory/30 focus:border-champagne/70" />
                              <select value={capacityFilter} onChange={(e) => setCapacityFilter(e.target.value)}
                                className="border border-ivory/15 bg-obsidian px-3 py-2 whisper text-ivory/70 outline-none focus:border-champagne/70">
                                <option value="all">All seats</option>
                                <option value="1-6">1-6 seats</option>
                                <option value="7-10">7-10 seats</option>
                                <option value="11+">11+ seats</option>
                              </select>
                            </div>
                            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-color:var(--color-gold)_transparent] [scrollbar-width:thin]">
                              {aircraftInventory.filter((a) => a.kind === aircraftKind && a.model.toLowerCase().includes(aircraftQuery.toLowerCase()) && (capacityFilter === "all" || (capacityFilter === "1-6" && !!a.seats && a.seats <= 6) || (capacityFilter === "7-10" && !!a.seats && a.seats >= 7 && a.seats <= 10) || (capacityFilter === "11+" && !!a.seats && a.seats >= 11))).slice(0, 80).map((a) => (
                                <button key={a.id} type="button" onClick={() => setSelectedAircraft(a)}
                                  className={`flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition-colors ${selectedAircraft?.id === a.id ? "border-champagne/80 bg-champagne/[0.08]" : "border-ivory/10 hover:border-ivory/35"}`}>
                                  <span className="font-serif text-base text-ivory">{a.model}</span>
                                  <span className="whisper shrink-0 text-ivory/50">{a.capacity}</span>
                                </button>
                              ))}
                            </div>
                            {selectedAircraft && <div className="mt-3 border-t border-ivory/10 pt-3 whisper text-champagne">SELECTED: {selectedAircraft.model}</div>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <InquiryStep step={currentStepMeta} context={context} travellers={travellers} selectedDistance={distance} budget={budget}
                        onTravellersChange={setTravellers} onDistanceChange={setDistance} onBudgetChange={setBudget}
                        peopleOptions={config.peopleOptions} distanceOptions={config.distanceOptions} />
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="results"
                    initial={reduced ? false : { opacity: 0, y: 26, filter: "blur(12px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -18, filter: "blur(8px)" }}
                    transition={{ duration: 0.8, ease }} className="flex flex-1 flex-col">
                    <div className="mb-8">
                      <div className="whisper text-champagne/80">{config.resultTitle}</div>
                      <div className="mt-4 h-px w-24 bg-gradient-to-r from-gold via-champagne to-transparent" />
                    </div>
                    <div className="mb-6">
                      <div className="font-serif text-3xl font-light text-ivory md:text-5xl">{resultCards.length} AIRCRAFT SELECTED</div>
                      <p className="mt-5 max-w-xl font-serif text-lg italic leading-relaxed text-ivory/70">{config.resultSummary}</p>
                    </div>
                    <div className="mt-2 grid gap-4 md:grid-cols-2">
                      {resultCards.map((card, i) => (
                        <motion.article key={card.name}
                          initial={reduced ? false : { opacity: 0, y: 22, filter: "blur(10px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          transition={{ duration: 0.7, delay: i * 0.1, ease }}
                          className="group overflow-hidden border border-ivory/10 bg-[oklch(0.16_0.008_275/0.52)]">
                          <div className="relative overflow-hidden">
                            <img src={scenes[context === "flights" ? "aviation" : context === "yachts" ? "yachts" : "residences"]} alt={card.name}
                              className="h-52 w-full object-cover transition duration-1000 group-hover:scale-[1.06]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/10 to-transparent" />
                          </div>
                          <div className="p-5">
                            <div className="whisper text-champagne/80">{card.category.toUpperCase()}</div>
                            <h3 className="mt-3 font-serif text-3xl font-light leading-tight text-ivory">{card.name}</h3>
                            <div className="mt-5 space-y-2 text-sm uppercase tracking-[0.18em] text-ivory/55">
                              <div>{card.seats}</div><div>{card.range}</div><div>{card.cruise}</div>
                            </div>
                            <p className="mt-5 font-serif text-lg italic leading-relaxed text-ivory/70">{card.mission}</p>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                    <div className="mt-8 border-t border-ivory/10 pt-6">
                      <Link to="/concierge" onClick={onClose}
                        className="group inline-flex items-center gap-4 whisper text-champagne transition-colors hover:text-ivory">
                        <span>{config.concierge}</span>
                        <span className="relative block h-px w-12 overflow-hidden bg-gold/50">
                          <span className="absolute inset-0 origin-left scale-x-0 bg-ivory transition-transform duration-700 ease-out group-hover:scale-x-100" />
                        </span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative mt-auto border-t border-ivory/10 pt-5">
            <div className="flex items-center justify-between gap-4">
              <button type="button" onClick={handleBack} disabled={!showResults && currentStep === 0}
                className="whisper inline-flex items-center gap-2 text-ivory/60 transition-colors hover:text-champagne disabled:cursor-not-allowed disabled:opacity-40">
                <span aria-hidden="true">←</span><span>BACK</span>
              </button>
              {!showResults && (
                <button type="button" onClick={handleAdvance} disabled={!canProceed}
                  className="whisper inline-flex items-center gap-3 text-champagne transition-colors hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40">
                  <span>{currentStep === config.steps.length - 1 ? config.cta : "NEXT"}</span>
                  <span className="relative block h-px w-12 overflow-hidden bg-gold/50">
                    <span className="absolute inset-0 origin-left scale-x-100 bg-ivory" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );

  return <AnimatePresence>{open && panel}</AnimatePresence>;
}
