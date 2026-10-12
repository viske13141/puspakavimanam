import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { PublicPage, PublicPageHero } from "@/components/public/PublicPage";
import { conciergeTimeframes, conciergeTypes, brand } from "@/content/site";
import { useEnquiry } from "@/components/forms/fields";
import conciergeImg from "@/assets/scenes/concierge.jpg";

export function ContactPublicPage() {
  const [v, setV] = useState({ full_name: "", email: "", phone: "", request_type: "", timeframe: "", message: "" });
  const [formError, setFormError] = useState("");
  const mutation = useEnquiry("concierge");
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.request_type || !v.timeframe) {
      setFormError("Choose a request type and timeframe to continue.");
      return;
    }
    setFormError("");
    mutation.mutate(v);
  };

  return (
    <PublicPage>
      <PublicPageHero
        eyebrow="Contact HELITEJET"
        headline="Start with your travel plans."
        sub="Share the details of your enquiry using the contact form."
        image={conciergeImg}
      />

      <section className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid gap-16 md:grid-cols-[1.2fr_0.8fr] md:gap-24">
            {/* Form */}
            <div>
              <p className="mb-4 font-sans text-[0.68rem] font-semibold tracking-[0.22em] text-[#B79A65] uppercase">Send an Enquiry</p>
              <h2 className="font-serif text-3xl font-light leading-[1.1] text-[#14263D] md:text-4xl">
                Start a Conversation.
              </h2>

              <AnimatePresence mode="wait">
                {mutation.isSuccess ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 border border-[#E5E9EF] bg-[#F6F4EF] p-8"
                  >
                    <p className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-[#B79A65] uppercase">Enquiry Received</p>
                    <h3 className="mt-4 font-serif text-2xl font-light text-[#14263D]">Thank you for reaching out.</h3>
                    <p className="mt-3 font-sans text-base leading-relaxed text-[#596579]">
                      A member of our team will be in touch with you shortly to discuss your requirements.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={onSubmit}
                    exit={{ opacity: 0 }}
                    className="mt-10 space-y-8"
                  >
                    {/* Request type */}
                    <div>
                      <label className="mb-3 block font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#596579] uppercase">
                        Nature of Request
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {conciergeTypes.map((type) => (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={v.request_type === type}
                            onClick={() => {
                              set("request_type")(type);
                              setFormError("");
                            }}
                            className={`border px-4 py-2 font-sans text-sm transition-all ${
                              v.request_type === type
                                ? "border-[#14263D] bg-[#14263D] text-white"
                                : "border-[#E5E9EF] text-[#596579] hover:border-[#14263D] hover:text-[#14263D]"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timeframe */}
                    <div>
                      <label className="mb-3 block font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#596579] uppercase">
                        Timeframe
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {conciergeTimeframes.map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            aria-pressed={v.timeframe === tf}
                            onClick={() => {
                              set("timeframe")(tf);
                              setFormError("");
                            }}
                            className={`border px-4 py-2 font-sans text-sm transition-all ${
                              v.timeframe === tf
                                ? "border-[#14263D] bg-[#14263D] text-white"
                                : "border-[#E5E9EF] text-[#596579] hover:border-[#14263D] hover:text-[#14263D]"
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="mb-2 block font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#596579] uppercase">
                        Your Request
                      </label>
                      <textarea
                        name="message"
                        required
                        rows={5}
                        placeholder="Where, when, for whom, and anything our team should know."
                        value={v.message}
                        onChange={(e) => set("message")(e.target.value)}
                        className="w-full border border-[#E5E9EF] bg-[#F7F8FA] px-4 py-3 font-sans text-sm text-[#152238] placeholder-[#8A96A6] outline-none transition-colors focus:border-[#14263D]"
                      />
                    </div>

                    {/* Contact fields */}
                    <div className="grid gap-6 md:grid-cols-3">
                      {([
                        ["full_name", "Full Name", "text", "name"],
                        ["email", "Email Address", "email", "email"],
                        ["phone", "Phone Number", "tel", "tel"],
                      ] as const).map(([key, label, type, autoComplete]) => (
                        <div key={key}>
                          <label className="mb-2 block font-sans text-[0.65rem] font-semibold tracking-[0.15em] text-[#596579] uppercase">
                            {label}
                          </label>
                          <input
                            type={type}
                            required={key !== "phone"}
                            autoComplete={autoComplete}
                            value={v[key]}
                            onChange={(e) => set(key)(e.target.value)}
                            className="w-full border border-[#E5E9EF] bg-[#F7F8FA] px-4 py-3 font-sans text-sm text-[#152238] placeholder-[#8A96A6] outline-none transition-colors focus:border-[#14263D]"
                          />
                        </div>
                      ))}
                    </div>

                    {(formError || mutation.isError) && (
                      <p role="alert" className="font-sans text-sm text-red-600">
                        {formError || "Something went wrong. Please try again or contact us directly."}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={mutation.isPending}
                      className="w-full bg-[#14263D] py-4 font-sans text-[0.72rem] font-semibold tracking-[0.12em] text-white transition-all duration-300 hover:bg-[#B79A65] disabled:opacity-60 md:w-auto md:px-12"
                    >
                      {mutation.isPending ? "SENDING…" : "SEND ENQUIRY →"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Contact info sidebar */}
            <aside className="md:sticky md:top-24 md:self-start">
              <div className="border border-[#E5E9EF] bg-[#F7F8FA] p-8">
                <p className="font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-[#B79A65] uppercase">Email HELITEJET</p>
                <h3 className="mt-4 font-serif text-2xl font-light text-[#14263D]">Speak to Our Team</h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-[#596579]">
                  Prefer not to use the enquiry form? Send an email to the address below.
                </p>
                <div className="mt-8 space-y-4 border-t border-[#E5E9EF] pt-6">
                  <div>
                    <p className="font-sans text-[0.6rem] font-semibold tracking-[0.15em] text-[#B79A65] uppercase">Email</p>
                    <a
                      href={`mailto:${brand.email}`}
                      className="mt-1 block font-sans text-sm text-[#596579] transition-colors hover:text-[#14263D]"
                    >
                      {brand.email}
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
