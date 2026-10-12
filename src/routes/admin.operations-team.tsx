import { invokeAccountFunction } from "@/lib/admin-accounts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { adminNav } from "@/lib/portal-nav";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

export const Route = createFileRoute("/admin/operations-team")({
  beforeLoad: () => requireRoleAccess(["ADMIN"]),
  component: OperationsTeamPage,
});

type OpsMember = {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  department: string | null;
  designation: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

type FormState = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  mobile: string;
  department: string;
  designation: string;
  status: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  full_name: "", email: "", password: "", confirm_password: "",
  mobile: "", department: "", designation: "", status: "active", notes: "",
};

function OperationsTeamPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<OpsMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Search / filter
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal state
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<OpsMember | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function loadMembers() {
    setLoading(true);
    setFetchError("");
    const { data, error } = await supabase
      .from("operations_members")
      .select("id, profile_id, full_name, email, mobile, department, designation, status, notes, created_at, created_by")
      .order("created_at", { ascending: false });
    if (error) { setFetchError(error.message); setLoading(false); return; }
    setMembers((data as OpsMember[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadMembers(); }, []);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) || (m.mobile ?? "").includes(q);
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const upd = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(c => ({ ...c, [k]: e.target.value }));

  function openAdd() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError(""); setFormSuccess("");
    setModalMode("add");
  }

  function openEdit(m: OpsMember) {
    setSelected(m);
    setForm({
      full_name: m.full_name, email: m.email, password: "", confirm_password: "",
      mobile: m.mobile ?? "", department: m.department ?? "",
      designation: m.designation ?? "", status: m.status, notes: m.notes ?? "",
    });
    setFormError(""); setFormSuccess("");
    setModalMode("edit");
  }

  function openView(m: OpsMember) {
    setSelected(m);
    setModalMode("view");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(""); setFormSuccess(""); setSubmitting(true);
    try {
      if (form.password !== form.confirm_password) throw new Error("Passwords do not match.");
      if (form.password.length < 8) throw new Error("Password must be at least 8 characters.");

      const { confirm_password: _confirmation, ...details } = form;
      await invokeAccountFunction("create-operations-user", { ...details, email: form.email.trim().toLowerCase() });
      setSearch("");
      setFilterStatus("all");
      setFormSuccess(`${form.full_name} added. They can log in at /login.`);
      setModalMode(null);
      void loadMembers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setFormError(""); setFormSuccess(""); setSubmitting(true);
    try {
      const updates: Record<string, string | null> = {
        full_name: form.full_name,
        mobile: form.mobile || null,
        department: form.department || null,
        designation: form.designation || null,
        status: form.status,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("operations_members")
        .update(updates)
        .eq("id", selected.id).select("id").single();
      if (error) throw new Error(error.message);

      setFormSuccess("Member updated.");
      setModalMode(null);
      void loadMembers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(m: OpsMember, status: string) {
    setFormError(""); setFormSuccess(""); setSubmitting(true);
    try {
      const { error } = await supabase.from("operations_members").update({ status, updated_at: new Date().toISOString() }).eq("id", m.id).select("id").single();
      if (error) throw new Error(error.message);
      await loadMembers();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to update status.");
    } finally { setSubmitting(false); }
  }

  async function deleteAccount(m: OpsMember) {
    if (!window.confirm(`Delete ${m.email} and their login account? This cannot be undone.`)) return;
    setSubmitting(true); setFormError(""); setFormSuccess("");
    try {
      await invokeAccountFunction("delete-managed-user", { kind: "operations", id: m.id });
      setFormSuccess("Account deleted.");
      await loadMembers();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete account.");
    } finally { setSubmitting(false); }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: "text-green-300 border-green-400/20 bg-green-900/10",
      inactive: "text-ivory/40 border-ivory/10 bg-white/[0.02]",
      suspended: "text-red-300 border-red-400/20 bg-red-900/10",
    };
    return map[s] ?? "text-ivory/40 border-ivory/10";
  };

  return (
    <PortalShell
      title="Operations Team"
      nav={adminNav}
      onLogout={() => { void logout().then(() => navigate({ to: "/login" })); }}
    >
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search name, email, mobile…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="field flex-1 min-w-48"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="field w-40"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          onClick={openAdd}
          className="border border-champagne/40 px-5 py-3 whisper text-champagne transition-all hover:border-champagne hover:bg-champagne/10"
        >
          + ADD MEMBER
        </button>
      </div>

      {/* Global success */}
      <AnimatePresence>
        {formSuccess && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mb-4 border border-green-400/20 bg-green-900/10 px-4 py-3 font-serif text-sm text-green-300">
            {formSuccess}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Table */}
      {formError && !modalMode && <p role="alert" className="mb-4 text-red-300">{formError}</p>}
      {loading ? (
        <p className="font-serif text-sm italic text-ivory/40">Loading…</p>
      ) : fetchError ? (
        <p className="font-serif text-sm italic text-red-300">{fetchError}</p>
      ) : filtered.length === 0 ? (
        <div className="border border-ivory/10 bg-white/[0.02] p-8 text-center">
          <p className="font-serif italic text-ivory/40">
            {members.length === 0 ? "No operations members yet. Add your first one." : "No results match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-ivory/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ivory/10 text-left">
                {["Name", "Email", "Mobile", "Department", "Designation", "Status", "Joined", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 whisper text-ivory/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-ivory/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-serif text-ivory">{m.full_name}</td>
                  <td className="px-4 py-3 text-ivory/60">{m.email}</td>
                  <td className="px-4 py-3 text-ivory/60">{m.mobile ?? "—"}</td>
                  <td className="px-4 py-3 text-ivory/60">{m.department ?? "—"}</td>
                  <td className="px-4 py-3 text-ivory/60">{m.designation ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`border px-2 py-0.5 text-xs whisper ${statusBadge(m.status)}`}>
                      {m.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ivory/40">{new Date(m.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openView(m)} className="whisper text-ivory/40 hover:text-ivory text-xs">VIEW</button>
                      <button disabled={submitting} onClick={() => deleteAccount(m)} className="whisper text-red-300 text-xs disabled:opacity-50">DELETE</button>
                      <button onClick={() => openEdit(m)} className="whisper text-champagne/60 hover:text-champagne text-xs">EDIT</button>
                      {m.status !== "active" && (
                        <button disabled={submitting} onClick={() => setStatus(m, "active")} className="whisper text-green-400/60 hover:text-green-300 text-xs">ACTIVATE</button>
                      )}
                      {m.status === "active" && (
                        <button disabled={submitting} onClick={() => setStatus(m, "inactive")} className="whisper text-ivory/30 hover:text-ivory/60 text-xs">DEACTIVATE</button>
                      )}
                      {m.status !== "suspended" && (
                        <button disabled={submitting} onClick={() => setStatus(m, "suspended")} className="whisper text-red-400/60 hover:text-red-300 text-xs">SUSPEND</button>
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalMode(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-lg border border-ivory/10 bg-[oklch(0.1_0.008_275)] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="whisper text-champagne">Operations Team</p>
                  <h2 className="mt-1 font-serif text-2xl font-light text-ivory">
                    {modalMode === "add" ? "Add Operations Member" : "Edit Member"}
                  </h2>
                </div>
                <button onClick={() => setModalMode(null)} className="text-xl leading-none text-ivory/40 hover:text-ivory">✕</button>
              </div>

              {formError && (
                <p className="mb-4 border border-red-300/20 bg-red-900/10 px-4 py-3 font-serif text-sm italic text-red-300">{formError}</p>
              )}

              <form onSubmit={modalMode === "add" ? handleAdd : handleEdit} className="space-y-5">
                {/* Full Name */}
                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Full Name *</span>
                  <input type="text" required value={form.full_name} onChange={upd("full_name")} className="field" />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                {/* Email — read-only in edit mode */}
                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Email *</span>
                  <input
                    type="email" required value={form.email} onChange={upd("email")}
                    readOnly={modalMode === "edit"}
                    className={`field ${modalMode === "edit" ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                </label>

                {/* Password fields — only on add */}
                {modalMode === "add" && (
                  <>
                    <label className="group relative block">
                      <span className="whisper block text-ivory/45">Password * (min 8 chars)</span>
                      <input type="password" required value={form.password} onChange={upd("password")} className="field" />
                      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                    </label>
                    <label className="group relative block">
                      <span className="whisper block text-ivory/45">Confirm Password *</span>
                      <input type="password" required value={form.confirm_password} onChange={upd("confirm_password")} className="field" />
                      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                    </label>
                  </>
                )}

                {/* Optional fields */}
                {(["mobile", "department", "designation"] as const).map(k => (
                  <label key={k} className="group relative block">
                    <span className="whisper block text-ivory/45 capitalize">{k.replace("_", " ")}</span>
                    <input type="text" value={form[k]} onChange={upd(k)} className="field" />
                    <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 group-focus-within:scale-x-100" />
                  </label>
                ))}

                {/* Status */}
                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Status</span>
                  <select value={form.status} onChange={upd("status")} className="field">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>

                {/* Notes */}
                <label className="group relative block">
                  <span className="whisper block text-ivory/45">Notes</span>
                  <textarea rows={2} value={form.notes} onChange={upd("notes")} className="field resize-none" />
                </label>

                {modalMode === "add" && (
                  <p className="font-serif text-xs italic text-ivory/30">
                    They log in at <span className="text-champagne">/login</span> → redirected to Operations dashboard.
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalMode(null)}
                    className="flex-1 border border-ivory/20 px-4 py-3 whisper text-ivory/50 hover:border-ivory/40 hover:text-ivory">
                    CANCEL
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 border border-champagne/40 bg-champagne/10 px-4 py-3 whisper text-champagne hover:border-champagne hover:bg-champagne/20 disabled:opacity-50">
                    {submitting ? "SAVING…" : modalMode === "add" ? "CREATE LOGIN" : "SAVE CHANGES"}
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalMode(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-md border border-ivory/10 bg-[oklch(0.1_0.008_275)] p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="whisper text-champagne">Operations Team</p>
                  <h2 className="mt-1 font-serif text-2xl font-light text-ivory">{selected.full_name}</h2>
                </div>
                <button onClick={() => setModalMode(null)} className="text-xl leading-none text-ivory/40 hover:text-ivory">✕</button>
              </div>
              <dl className="space-y-3 font-serif text-sm">
                {[
                  ["Email", selected.email],
                  ["Mobile", selected.mobile ?? "—"],
                  ["Department", selected.department ?? "—"],
                  ["Designation", selected.designation ?? "—"],
                  ["Status", selected.status.toUpperCase()],
                  ["Notes", selected.notes ?? "—"],
                  ["Created", new Date(selected.created_at).toLocaleString()],
                  ["Created by", selected.created_by ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <dt className="w-28 shrink-0 whisper text-ivory/40">{label}</dt>
                    <dd className="text-ivory/80 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex gap-3">
                <button onClick={() => openEdit(selected)}
                  className="flex-1 border border-champagne/40 px-4 py-3 whisper text-champagne hover:border-champagne hover:bg-champagne/10">
                  EDIT
                </button>
                <button onClick={() => setModalMode(null)}
                  className="flex-1 border border-ivory/20 px-4 py-3 whisper text-ivory/50 hover:border-ivory/40 hover:text-ivory">
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
