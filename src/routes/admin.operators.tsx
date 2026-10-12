import { invokeAccountFunction } from "@/lib/admin-accounts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { adminNav } from "@/lib/portal-nav";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

export const Route = createFileRoute("/admin/operators")({
  beforeLoad: () => requireRoleAccess(["ADMIN"]),
  component: OperatorsPage,
});

type Operator = {
  id: string;
  profile_id: string;
  company_name: string;
  contact_person: string;
  email: string;
  mobile: string | null;
  licence_number: string | null;
  aoc_number: string | null;
  service_type: string;
  company_address: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

type FormState = {
  company_name: string;
  contact_person: string;
  email: string;
  password: string;
  confirm_password: string;
  mobile: string;
  licence_number: string;
  aoc_number: string;
  service_type: string;
  company_address: string;
  status: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  company_name: "",
  contact_person: "",
  email: "",
  password: "",
  confirm_password: "",
  mobile: "",
  licence_number: "",
  aoc_number: "",
  service_type: "both",
  company_address: "",
  status: "pending_verification",
  notes: "",
};

const STATUS_LABELS: Record<string, string> = {
  pending_verification: "PENDING",
  active: "ACTIVE",
  inactive: "INACTIVE",
  suspended: "SUSPENDED",
  rejected: "REJECTED",
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending_verification: "text-yellow-300 border-yellow-400/20 bg-yellow-900/10",
    active: "text-green-300 border-green-400/20 bg-green-900/10",
    inactive: "text-ivory/40 border-ivory/10 bg-white/[0.02]",
    suspended: "text-red-300 border-red-400/20 bg-red-900/10",
    rejected: "text-red-400/60 border-red-400/10 bg-red-900/5",
  };
  return map[s] ?? "text-ivory/40 border-ivory/10";
};

function OperatorsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterService, setFilterService] = useState("all");

  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<Operator | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function loadOperators() {
    setLoading(true);
    setFetchError("");
    const { data, error } = await supabase
      .from("operators")
      .select(
        "id, profile_id, company_name, contact_person, email, mobile, licence_number, aoc_number, service_type, company_address, status, notes, created_at, created_by",
      )
      .order("created_at", { ascending: false });
    if (error) {
      setFetchError(error.message);
      setLoading(false);
      return;
    }
    setOperators((data as Operator[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadOperators();
  }, []);

  const filtered = operators.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.company_name.toLowerCase().includes(q) ||
      o.contact_person.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      (o.mobile ?? "").includes(q);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchService = filterService === "all" || o.service_type === filterService;
    return matchSearch && matchStatus && matchService;
  });

  const upd =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((c) => ({ ...c, [k]: e.target.value }));

  function openAdd() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormSuccess("");
    setModalMode("add");
  }

  function openEdit(o: Operator) {
    setSelected(o);
    setForm({
      company_name: o.company_name,
      contact_person: o.contact_person,
      email: o.email,
      password: "",
      confirm_password: "",
      mobile: o.mobile ?? "",
      licence_number: o.licence_number ?? "",
      aoc_number: o.aoc_number ?? "",
      service_type: o.service_type,
      company_address: o.company_address ?? "",
      status: o.status,
      notes: o.notes ?? "",
    });
    setFormError("");
    setFormSuccess("");
    setModalMode("edit");
  }

  function openView(o: Operator) {
    setSelected(o);
    setModalMode("view");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);
    try {
      if (form.password !== form.confirm_password) throw new Error("Passwords do not match.");
      if (form.password.length < 8) throw new Error("Password must be at least 8 characters.");

      const { confirm_password: _confirmation, ...details } = form;
      await invokeAccountFunction("create-operator-user", {
        ...details,
        email: form.email.trim().toLowerCase(),
      });
      setSearch("");
      setFilterStatus("all");
      setFilterService("all");
      setFormSuccess(
        `${form.contact_person} added with status: ${STATUS_LABELS[form.status] ?? form.status}.`,
      );
      setModalMode(null);
      void loadOperators();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("operators")
        .update({
          company_name: form.company_name,
          contact_person: form.contact_person,
          mobile: form.mobile || null,
          licence_number: form.licence_number || null,
          aoc_number: form.aoc_number || null,
          service_type: form.service_type,
          company_address: form.company_address || null,
          status: form.status,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      setFormSuccess("Operator updated.");
      setModalMode(null);
      void loadOperators();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(o: Operator, status: string) {
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("operators")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", o.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await loadOperators();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAccount(o: Operator) {
    if (!window.confirm(`Delete ${o.email} and their login account? This cannot be undone.`))
      return;
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    try {
      await invokeAccountFunction("delete-managed-user", { kind: "operator", id: o.id });
      setFormSuccess("Account deleted.");
      await loadOperators();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalShell
      title="Operators"
      nav={adminNav}
      onLogout={() => {
        void logout().then(() => navigate({ to: "/login" }));
      }}
    >
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field flex-1 min-w-48"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="field w-44"
        >
          <option value="all">All statuses</option>
          <option value="pending_verification">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          className="field w-40"
        >
          <option value="all">All services</option>
          <option value="helicopter">Helicopter</option>
          <option value="private_jet">Private Jet</option>
          <option value="both">Both</option>
        </select>
        <button
          onClick={openAdd}
          className="border border-champagne/40 px-5 py-3 whisper text-champagne transition-all hover:border-champagne hover:bg-champagne/10"
        >
          + ADD OPERATOR
        </button>
      </div>

      <AnimatePresence>
        {formSuccess && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 border border-green-400/20 bg-green-900/10 px-4 py-3 font-serif text-sm text-green-300"
          >
            {formSuccess}
          </motion.p>
        )}
      </AnimatePresence>

      {formError && !modalMode && (
        <p role="alert" className="mb-4 text-red-300">
          {formError}
        </p>
      )}
      {loading ? (
        <p className="font-serif text-sm italic text-ivory/40">Loading…</p>
      ) : fetchError ? (
        <p className="font-serif text-sm italic text-red-300">{fetchError}</p>
      ) : filtered.length === 0 ? (
        <div className="border border-ivory/10 bg-white/[0.02] p-8 text-center">
          <p className="font-serif italic text-ivory/40">
            {operators.length === 0
              ? "No operators yet. Add your first one."
              : "No results match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-ivory/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ivory/10 text-left">
                {[
                  "Name",
                  "Company",
                  "Email",
                  "Service",
                  "Licence",
                  "Status",
                  "Joined",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 whisper text-ivory/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-ivory/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-serif text-ivory">{o.contact_person}</td>
                  <td className="px-4 py-3 text-ivory/60">{o.company_name || "—"}</td>
                  <td className="px-4 py-3 text-ivory/60">{o.email}</td>
                  <td className="px-4 py-3 text-ivory/60 capitalize">
                    {o.service_type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-ivory/60">{o.licence_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`border px-2 py-0.5 text-xs whisper ${statusBadge(o.status)}`}>
                      {STATUS_LABELS[o.status] ?? o.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ivory/40">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openView(o)}
                        className="whisper text-ivory/40 hover:text-ivory text-xs"
                      >
                        VIEW
                      </button>
                      <button
                        disabled={submitting}
                        onClick={() => deleteAccount(o)}
                        className="whisper text-red-300 text-xs disabled:opacity-50"
                      >
                        DELETE
                      </button>
                      <button
                        onClick={() => openEdit(o)}
                        className="whisper text-champagne/60 hover:text-champagne text-xs"
                      >
                        EDIT
                      </button>
                      {o.status !== "active" && (
                        <button
                          disabled={submitting}
                          onClick={() => setStatus(o, "active")}
                          className="whisper text-green-400/60 hover:text-green-300 text-xs"
                        >
                          ACTIVATE
                        </button>
                      )}
                      {o.status === "active" && (
                        <button
                          disabled={submitting}
                          onClick={() => setStatus(o, "inactive")}
                          className="whisper text-ivory/30 hover:text-ivory/60 text-xs"
                        >
                          DEACTIVATE
                        </button>
                      )}
                      {o.status !== "suspended" && o.status !== "rejected" && (
                        <button
                          disabled={submitting}
                          onClick={() => setStatus(o, "suspended")}
                          className="whisper text-red-400/60 hover:text-red-300 text-xs"
                        >
                          SUSPEND
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(modalMode === "add" || modalMode === "edit") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalMode(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-lg border border-ivory/10 bg-[oklch(0.1_0.008_275)] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="whisper text-champagne">Operators</p>
                  <h2 className="mt-1 font-serif text-2xl font-light text-ivory">
                    {modalMode === "add" ? "Add Operator" : "Edit Operator"}
                  </h2>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-xl leading-none text-ivory/40 hover:text-ivory"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <p className="mb-4 border border-red-300/20 bg-red-900/10 px-4 py-3 font-serif text-sm italic text-red-300">
                  {formError}
                </p>
              )}

              <form onSubmit={modalMode === "add" ? handleAdd : handleEdit} className="space-y-5">
                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Operator Name *</span>
                  <input
                    type="text"
                    required
                    value={form.contact_person}
                    onChange={upd("contact_person")}
                    className="field"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Company Name (optional)</span>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={upd("company_name")}
                    className="field"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Email *</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={upd("email")}
                    readOnly={modalMode === "edit"}
                    className={`field ${modalMode === "edit" ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                {modalMode === "add" && (
                  <>
                    <label className="group relative block">
                      <span className="whisper block text-ivory/45">Password * (min 8 chars)</span>
                      <input
                        type="password"
                        required
                        value={form.password}
                        onChange={upd("password")}
                        className="field"
                      />
                      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                    </label>
                    <label className="group relative block">
                      <span className="whisper block text-ivory/45">Confirm Password *</span>
                      <input
                        type="password"
                        required
                        value={form.confirm_password}
                        onChange={upd("confirm_password")}
                        className="field"
                      />
                      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                    </label>
                  </>
                )}

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Mobile</span>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={upd("mobile")}
                    className="field"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Service Type</span>
                  <select
                    value={form.service_type}
                    onChange={upd("service_type")}
                    className="field"
                  >
                    <option value="helicopter">Helicopter</option>
                    <option value="private_jet">Private Jet</option>
                    <option value="both">Both</option>
                  </select>
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Licence Number</span>
                  <input
                    type="text"
                    value={form.licence_number}
                    onChange={upd("licence_number")}
                    className="field"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">AOC Number</span>
                  <input
                    type="text"
                    value={form.aoc_number}
                    onChange={upd("aoc_number")}
                    className="field"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Company Address</span>
                  <input
                    type="text"
                    value={form.company_address}
                    onChange={upd("company_address")}
                    className="field"
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Status</span>
                  <select value={form.status} onChange={upd("status")} className="field">
                    <option value="pending_verification">Pending Verification</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>

                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Notes</span>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={upd("notes")}
                    className="field resize-none"
                  />
                </label>

                {modalMode === "add" && (
                  <p className="font-serif text-xs italic text-ivory/30">
                    Operator logs in at <span className="text-champagne">/login</span>. Pending
                    operators cannot access operational functions until verified and activated.
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="flex-1 border border-ivory/20 px-4 py-3 whisper text-ivory/50 hover:border-ivory/40 hover:text-ivory"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 border border-champagne/40 bg-champagne/10 px-4 py-3 whisper text-champagne hover:border-champagne hover:bg-champagne/20 disabled:opacity-50"
                  >
                    {submitting
                      ? "SAVING…"
                      : modalMode === "add"
                        ? "CREATE OPERATOR"
                        : "SAVE CHANGES"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {modalMode === "view" && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalMode(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-md border border-ivory/10 bg-[oklch(0.1_0.008_275)] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="whisper text-champagne">Operator Details</p>
                  <h2 className="mt-1 font-serif text-2xl font-light text-ivory">
                    {selected.contact_person}
                  </h2>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-xl leading-none text-ivory/40 hover:text-ivory"
                >
                  ✕
                </button>
              </div>
              <dl className="space-y-3 font-serif text-sm">
                {[
                  ["Operator Name", selected.contact_person],
                  ["Company Name", selected.company_name || "—"],
                  ["Email", selected.email],
                  ["Mobile", selected.mobile ?? "—"],
                  ["Service Type", selected.service_type.replace("_", " ")],
                  ["Licence No.", selected.licence_number ?? "—"],
                  ["AOC No.", selected.aoc_number ?? "—"],
                  ["Address", selected.company_address ?? "—"],
                  ["Status", STATUS_LABELS[selected.status] ?? selected.status],
                  ["Notes", selected.notes ?? "—"],
                  ["Created", new Date(selected.created_at).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <dt className="w-28 shrink-0 whisper text-ivory/40">{label}</dt>
                    <dd className="text-ivory/80 break-all capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => openEdit(selected)}
                  className="flex-1 border border-champagne/40 px-4 py-3 whisper text-champagne hover:border-champagne hover:bg-champagne/10"
                >
                  EDIT
                </button>
                <button
                  onClick={() => setModalMode(null)}
                  className="flex-1 border border-ivory/20 px-4 py-3 whisper text-ivory/50 hover:border-ivory/40 hover:text-ivory"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalShell>
  );
}
