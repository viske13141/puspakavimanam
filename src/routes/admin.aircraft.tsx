import { createFileRoute } from "@tanstack/react-router";
import { requireRoleAccess, useAuth } from "@/lib/auth";
import { PortalShell } from "@/components/dashboard/PortalShell";
import { useNavigate } from "@tanstack/react-router";
import { adminNav } from "@/lib/portal-nav";
import { Fragment, useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "motion/react";

const R2 = "https://f91f6a555fad7eef00d6f7a144e4a5b2.r2.cloudflarestorage.com/helightjetproduction";
async function uploadToR2(file: File, path: string): Promise<string> {
  const res = await fetch(`${R2}/${path}`, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
  return `${R2}/${path}`;
}

type AircraftRow = {
  id: string;
  kind: "flight" | "helicopter";
  model: string;
  capacity: string;
  seats: number | null;
};
type AircraftOperationalConfig = {
  aircraft_kind: "flight" | "helicopter";
  aircraft_model: string;
  maximum_payload_kg: number | null;
  baggage_capacity_kg: number | null;
  configured_at: string | null;
};
type AddMode = "choose" | "single" | "json";

function AdminAircraft() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [aircraft, setAircraft] = useState<AircraftRow[]>([]);
  const [operationalConfigs, setOperationalConfigs] = useState<
    Record<string, AircraftOperationalConfig>
  >({});
  const [configDrafts, setConfigDrafts] = useState<
    Record<string, { maximumPayload: string; baggageCapacity: string }>
  >({});
  const [configSaving, setConfigSaving] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<"all" | "flight" | "helicopter">("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("choose");
  const [kind, setKind] = useState<"flight" | "helicopter" | null>(null);
  const [editingAircraft, setEditingAircraft] = useState<AircraftRow | null>(null);
  const [sModel, setSModel] = useState("");
  const [sCapacity, setSCapacity] = useState("");
  const [sImageFiles, setSImageFiles] = useState<File[]>([]);
  const [sError, setSError] = useState("");
  const [saving, setSaving] = useState(false);

  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [jsonPreview, setJsonPreview] = useState<Omit<AircraftRow, "id">[]>([]);
  const [importKind, setImportKind] = useState<"flight" | "helicopter">("flight");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError("");
    const [{ data, error: err }, { data: configData, error: configError }] = await Promise.all([
      supabase.from("aircraft").select("*").order("kind").order("model"),
      supabase
        .from("aircraft_operational_config")
        .select(
          "aircraft_kind,aircraft_model,maximum_payload_kg,baggage_capacity_kg,configured_at",
        ),
    ]);
    if (err) setError(err.message);
    else setAircraft((data ?? []) as AircraftRow[]);
    if (configError) setError(configError.message);
    const configRows = (configData ?? []) as AircraftOperationalConfig[];
    setOperationalConfigs(
      Object.fromEntries(
        configRows.map((config) => [`${config.aircraft_kind}:${config.aircraft_model}`, config]),
      ),
    );
    setConfigDrafts(
      Object.fromEntries(
        configRows.map((config) => [
          `${config.aircraft_kind}:${config.aircraft_model}`,
          {
            maximumPayload:
              config.maximum_payload_kg == null ? "" : String(config.maximum_payload_kg),
            baggageCapacity:
              config.baggage_capacity_kg == null ? "" : String(config.baggage_capacity_kg),
          },
        ]),
      ),
    );
    setLoading(false);
  }

  async function saveOperationalConfig(row: AircraftRow) {
    const configKey = `${row.kind}:${row.model}`;
    const draft = configDrafts[configKey] ?? { maximumPayload: "", baggageCapacity: "" };
    const maximumPayload = draft.maximumPayload.trim() ? Number(draft.maximumPayload) : null;
    const baggageCapacity = draft.baggageCapacity.trim() ? Number(draft.baggageCapacity) : null;
    if (
      (maximumPayload !== null && (!Number.isFinite(maximumPayload) || maximumPayload <= 0)) ||
      (baggageCapacity !== null && (!Number.isFinite(baggageCapacity) || baggageCapacity <= 0))
    ) {
      setError("Configured capacity values must be positive numbers or left blank.");
      return;
    }
    setConfigSaving(configKey);
    setError("");
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("Your session has expired.");
      setConfigSaving("");
      return;
    }
    const now = new Date().toISOString();
    const { error: saveError } = await supabase
      .from("aircraft_operational_config")
      .upsert(
        {
          aircraft_kind: row.kind,
          aircraft_model: row.model,
          maximum_payload_kg: maximumPayload,
          baggage_capacity_kg: baggageCapacity,
          configured_by: user.id,
          configured_at: now,
          updated_at: now,
        },
        { onConflict: "aircraft_kind,aircraft_model" },
      );
    if (saveError) setError(saveError.message);
    else await load();
    setConfigSaving("");
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = aircraft.filter((a) => {
    if (filter !== "all" && a.kind !== filter) return false;
    if (search && !a.model.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((a) => selectedIds.includes(a.id));

  function openModal() {
    setShowModal(true);
    setAddMode("choose");
    setKind(null);
    setEditingAircraft(null);
    setSModel("");
    setSCapacity("");
    setSImageFiles([]);
    setSError("");
    setJsonText("");
    setJsonError("");
    setJsonPreview([]);
    setImportKind("flight");
  }

  function openEdit(row: AircraftRow) {
    setShowModal(true);
    setAddMode("single");
    setKind(row.kind);
    setEditingAircraft(row);
    setSModel(row.model);
    setSCapacity(row.capacity);
    setSImageFiles([]);
    setSError("");
  }

  async function handleSingleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!kind) return setSError("Select a type.");
    if (!sModel.trim()) return setSError("Enter a model name.");
    if (!sCapacity.trim()) return setSError("Enter seating capacity.");
    setSaving(true); setSError("");
    try {
      const seats = Number(sCapacity.match(/\d+/)?.[0]) || null;
      let aircraftId: string;
      if (editingAircraft) {
        const { error: err } = await supabase.from("aircraft").update({ kind, model: sModel.trim(), capacity: sCapacity.trim(), seats }).eq("id", editingAircraft.id);
        if (err) throw new Error(err.message);
        aircraftId = editingAircraft.id;
      } else {
        const { data, error: err } = await supabase.from("aircraft").insert({ kind, model: sModel.trim(), capacity: sCapacity.trim(), seats }).select("id").single();
        if (err) throw new Error(err.message);
        aircraftId = (data as { id: string }).id;
      }
      if (sImageFiles.length > 0) {
        const uploads = await Promise.all(sImageFiles.map(async (file, i) => {
          const ext = file.name.split(".").pop();
          const path = `aircraft/${kind}/${Date.now()}-${i}-${sModel.trim().replace(/\s+/g, "-")}.${ext}`;
          const url = await uploadToR2(file, path);
          return { aircraft_id: aircraftId, image_url: url, display_order: i };
        }));
        const { error: imgErr } = await supabase.from("aircraft_images").insert(uploads);
        if (imgErr) throw new Error(imgErr.message);
      }
      setShowModal(false); void load();
    } catch (err) {
      setSError(err instanceof Error ? err.message : "Save failed.");
    } finally { setSaving(false); }
  }

  function parseJsonInput(text: string, fallbackKind = importKind) {
    setJsonText(text);
    setJsonError("");
    setJsonPreview([]);
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      const entries = arr.map((item, i) => {
        const o = item as Record<string, unknown>;
        const rawKind = String(o.kind ?? o.type ?? o["Aircraft Type"] ?? "").toLowerCase();
        const k =
          rawKind.includes("heli") || rawKind.includes("rw") || rawKind.includes("rotor")
            ? "helicopter"
            : rawKind.includes("flight") || rawKind.includes("fw") || rawKind.includes("fixed")
              ? "flight"
              : fallbackKind;
        const model = String(o.model ?? o.name ?? o.aircraft ?? o["aircraft"] ?? o.Model ?? "");
        const capacity = String(o.capacity ?? o.seats ?? o.seating ?? o["Seating Capacity"] ?? "");
        if (!model) throw new Error(`Item ${i + 1}: missing "model" field`);
        return { kind: k, model, capacity, seats: Number(capacity.match(/\d+/)?.[0]) || null };
      });
      setJsonPreview(entries);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parseJsonInput(String(ev.target?.result ?? ""));
    reader.readAsText(file);
  }

  async function handleJsonImport() {
    if (!jsonPreview.length) return;
    setImporting(true);
    const { error: err } = await supabase.from("aircraft").insert(jsonPreview);
    if (err) {
      setJsonError(err.message);
      setImporting(false);
      return;
    }
    setImporting(false);
    setShowModal(false);
    void load();
  }

  async function handleDelete(id: string) {
    const { error: err } = await supabase.from("aircraft").delete().eq("id", id);
    if (err) setError(err.message);
    else setSelectedIds((ids) => ids.filter((selectedId) => selectedId !== id));
    void load();
  }

  function toggleSelected(id: string) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((selectedId) => selectedId !== id) : [...ids, id],
    );
  }

  function toggleAllFiltered() {
    setSelectedIds((ids) => {
      if (allFilteredSelected) {
        const visibleIds = new Set(filtered.map((a) => a.id));
        return ids.filter((id) => !visibleIds.has(id));
      }
      return [...new Set([...ids, ...filtered.map((a) => a.id)])];
    });
  }

  async function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected aircraft?`)) return;
    const idsToDelete = [...selectedIds];
    const { error: err } = await supabase.from("aircraft").delete().in("id", idsToDelete);
    if (err) setError(err.message);
    else setSelectedIds([]);
    void load();
  }

  return (
    <PortalShell
      title="Aircraft"
      nav={adminNav as { label: string; to: string }[]}
      onLogout={() => {
        void logout().then(() => navigate({ to: "/login" }));
      }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="whisper text-champagne">FLEET INVENTORY</p>
          <p className="mt-1 font-serif text-2xl font-light text-ivory">
            {aircraft.length} aircraft
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 border border-champagne/50 px-5 py-2.5 whisper text-champagne transition-colors hover:bg-champagne/10"
        >
          + ADD AIRCRAFT
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {(["all", "flight", "helicopter"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`border px-4 py-1.5 whisper text-xs transition-colors ${filter === f ? "border-champagne text-champagne" : "border-ivory/20 text-ivory/50 hover:border-ivory/50"}`}
          >
            {f === "all"
              ? `ALL (${aircraft.length})`
              : f === "flight"
                ? `FLIGHTS (${aircraft.filter((a) => a.kind === "flight").length})`
                : `HELICOPTERS (${aircraft.filter((a) => a.kind === "helicopter").length})`}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search model…"
          className="ml-auto border border-ivory/15 bg-transparent px-3 py-1.5 font-serif text-sm text-ivory outline-none placeholder:text-ivory/30 focus:border-champagne/60 md:w-56"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-champagne/20 bg-champagne/[0.04] px-4 py-3">
        <label className="flex items-center gap-2 whisper text-xs text-ivory/60">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAllFiltered}
            disabled={!filtered.length}
            className="accent-[var(--champagne)]"
          />
          SELECT ALL FILTERED ({filtered.length})
        </label>
        <button
          type="button"
          onClick={handleBulkDelete}
          disabled={!selectedIds.length}
          className="whisper text-xs text-red-300 transition-colors hover:text-red-200 disabled:opacity-30"
        >
          DELETE SELECTED ({selectedIds.length})
        </button>
      </div>

      {error && <p className="mb-4 border border-red-300/30 p-3 text-sm text-red-200">{error}</p>}

      {loading ? (
        <p className="py-12 text-center font-serif italic text-ivory/30">Loading fleet…</p>
      ) : (
        <div className="border border-ivory/10 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ivory/10">
                <th className="w-12 px-4 py-3"></th>
                <th className="px-4 py-3 whisper text-ivory/40 font-normal">TYPE</th>
                <th className="px-4 py-3 whisper text-ivory/40 font-normal">MODEL</th>
                <th className="px-4 py-3 whisper text-ivory/40 font-normal">SEATING</th>
                <th className="px-4 py-3 whisper text-ivory/40 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const configKey = `${a.kind}:${a.model}`;
                const config = operationalConfigs[configKey];
                const draft = configDrafts[configKey] ?? {
                  maximumPayload: "",
                  baggageCapacity: "",
                };
                return (
                  <Fragment key={a.id}>
                    <tr className="border-b border-ivory/[0.06] hover:bg-ivory/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(a.id)}
                          onChange={() => toggleSelected(a.id)}
                          aria-label={`Select ${a.model}`}
                          className="accent-[var(--champagne)]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`whisper text-[0.6rem] px-2 py-0.5 border ${a.kind === "flight" ? "border-champagne/40 text-champagne" : "border-ivory/30 text-ivory/60"}`}
                        >
                          {a.kind === "flight" ? "FLIGHT" : "HELICOPTER"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-serif text-ivory">{a.model}</td>
                      <td className="px-4 py-3 text-ivory/60">{a.capacity}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="mr-4 whisper text-[0.6rem] text-ivory/40 hover:text-champagne transition-colors"
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="whisper text-[0.6rem] text-ivory/30 hover:text-red-400 transition-colors"
                        >
                          REMOVE
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b border-ivory/10 bg-white/[0.015]">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="w-44">
                            <span className="whisper text-[0.55rem] text-ivory/40">
                              MAXIMUM PAYLOAD (KG)
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={draft.maximumPayload}
                              onChange={(event) =>
                                setConfigDrafts((current) => ({
                                  ...current,
                                  [configKey]: { ...draft, maximumPayload: event.target.value },
                                }))
                              }
                              className="field mt-1"
                              placeholder="Not configured"
                            />
                          </label>
                          <label className="w-44">
                            <span className="whisper text-[0.55rem] text-ivory/40">
                              BAGGAGE CAPACITY (KG)
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={draft.baggageCapacity}
                              onChange={(event) =>
                                setConfigDrafts((current) => ({
                                  ...current,
                                  [configKey]: { ...draft, baggageCapacity: event.target.value },
                                }))
                              }
                              className="field mt-1"
                              placeholder="Not configured"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={configSaving === configKey}
                            onClick={() => void saveOperationalConfig(a)}
                            className="border border-champagne/40 px-3 py-2 whisper text-champagne disabled:opacity-40"
                          >
                            {configSaving === configKey ? "SAVING..." : "SAVE LIMITS"}
                          </button>
                          <span className="text-xs text-ivory/35">
                            {config &&
                            (config.maximum_payload_kg !== null ||
                              config.baggage_capacity_kg !== null)
                              ? `Configured ${config.configured_at ? new Date(config.configured_at).toLocaleDateString() : "date not recorded"}`
                              : "No approved operational limits configured"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center font-serif italic text-ivory/30"
                  >
                    {aircraft.length === 0
                      ? "No aircraft yet. Click + ADD AIRCRAFT to get started."
                      : "No aircraft match your filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="w-full max-w-lg border border-ivory/15 bg-[oklch(0.1_0.008_275)] p-7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-ivory/10 pb-5">
                <div>
                  <p className="whisper text-champagne">FLEET MANAGEMENT</p>
                  <h2 className="mt-2 font-serif text-3xl font-light text-ivory">
                    {editingAircraft
                      ? "Edit Aircraft"
                      : addMode === "choose"
                        ? "Add Aircraft"
                        : addMode === "single"
                          ? kind
                            ? `Add ${kind === "flight" ? "Flight" : "Helicopter"}`
                            : "Select Type"
                          : "Import via JSON"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-2xl text-ivory/50 hover:text-champagne"
                >
                  ×
                </button>
              </div>

              {addMode === "choose" && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-ivory/50">How would you like to add aircraft?</p>
                  <button
                    type="button"
                    onClick={() => setAddMode("single")}
                    className="w-full border border-champagne/40 py-4 text-left px-5 transition-colors hover:bg-champagne/10"
                  >
                    <span className="whisper text-champagne block">ADD ONE BY ONE →</span>
                    <span className="mt-1 block text-xs text-ivory/40">
                      Enter model name and seating manually
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode("json")}
                    className="w-full border border-ivory/20 py-4 text-left px-5 transition-colors hover:border-ivory/50"
                  >
                    <span className="whisper text-ivory/70 block">IMPORT JSON →</span>
                    <span className="mt-1 block text-xs text-ivory/40">
                      Paste or upload a JSON file with multiple aircraft
                    </span>
                  </button>
                </div>
              )}

              {addMode === "single" && !kind && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-ivory/50">What type of aircraft?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setKind("flight")}
                      className="border border-ivory/20 py-6 text-left px-5 transition-colors hover:border-champagne/60 hover:bg-champagne/[0.05]"
                    >
                      <span className="font-serif text-lg text-ivory block">Flight</span>
                      <span className="mt-1 block text-xs text-ivory/35">Fixed-wing aircraft</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind("helicopter")}
                      className="border border-ivory/20 py-6 text-left px-5 transition-colors hover:border-champagne/60 hover:bg-champagne/[0.05]"
                    >
                      <span className="font-serif text-lg text-ivory block">Helicopter</span>
                      <span className="mt-1 block text-xs text-ivory/35">Rotorcraft</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddMode("choose")}
                    className="whisper text-ivory/40 hover:text-champagne text-xs"
                  >
                    ← BACK
                  </button>
                </div>
              )}

              {addMode === "single" && kind && (
                <form onSubmit={handleSingleSubmit} className="mt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`whisper text-[0.6rem] px-2 py-0.5 border ${kind === "flight" ? "border-champagne/40 text-champagne" : "border-ivory/30 text-ivory/60"}`}
                    >
                      {kind === "flight" ? "FLIGHT" : "HELICOPTER"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setKind(null)}
                      className="whisper text-[0.6rem] text-ivory/30 hover:text-champagne"
                    >
                      CHANGE
                    </button>
                  </div>
                  {sError && (
                    <p className="border border-red-300/30 p-3 text-sm text-red-200">{sError}</p>
                  )}
                  <label className="block">
                    <span className="whisper text-ivory/50">Model name</span>
                    <input
                      className="field mt-1"
                      value={sModel}
                      onChange={(e) => setSModel(e.target.value)}
                      placeholder={kind === "flight" ? "e.g. Gulfstream G550" : "e.g. Bell 407"}
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="whisper text-ivory/50">Seating capacity</span>
                    <input
                      className="field mt-1"
                      value={sCapacity}
                      onChange={(e) => setSCapacity(e.target.value)}
                      placeholder="e.g. 8"
                    />
                  </label>
                  <label className="block">
                    <span className="whisper text-ivory/50">Aircraft images <span className="text-ivory/30">(optional, multiple)</span></span>
                    <div className="mt-1">
                      <button type="button" onClick={() => imageRef.current?.click()}
                        className="border border-ivory/20 px-4 py-2 whisper text-xs text-ivory/60 hover:border-champagne hover:text-champagne transition-colors">
                        + ADD IMAGES
                      </button>
                      <input ref={imageRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => setSImageFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])} />
                      {sImageFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {sImageFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-ivory/50">
                              <span className="flex-1 truncate">{f.name}</span>
                              <button type="button" onClick={() => setSImageFiles((prev) => prev.filter((_, j) => j !== i))} className="text-ivory/30 hover:text-red-300">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ivory/25">JPG, PNG, WebP · stored in Cloudflare R2</p>
                  </label>
                  <div className="flex items-center justify-between border-t border-ivory/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setKind(null)}
                      className="whisper text-ivory/40 hover:text-champagne"
                    >
                      ← BACK
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="whisper text-champagne hover:text-ivory disabled:opacity-50"
                    >
                      {saving
                        ? "SAVING…"
                        : editingAircraft
                          ? "UPDATE AIRCRAFT →"
                          : "ADD AIRCRAFT →"}
                    </button>
                  </div>
                </form>
              )}

              {addMode === "json" && (
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="whisper text-ivory/50">Import type for rows without a type</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(["flight", "helicopter"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setImportKind(option);
                            parseJsonInput(jsonText, option);
                          }}
                          className={`border py-2 whisper text-xs transition-colors ${importKind === option ? "border-champagne text-champagne" : "border-ivory/20 text-ivory/50 hover:border-ivory/50"}`}
                        >
                          {option === "flight" ? "FLIGHTS" : "HELICOPTERS"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-ivory/40">
                    Expected format:{" "}
                    <code className="text-champagne/70">
                      [{`{"kind":"flight","model":"...","capacity":"8"}`}]
                    </code>
                    <br />
                    <code className="text-ivory/50">kind</code>: "flight" or "helicopter" ·{" "}
                    <code className="text-ivory/50">model</code> ·{" "}
                    <code className="text-ivory/50">capacity</code>
                  </p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="border border-ivory/20 px-4 py-2 whisper text-xs text-ivory/60 hover:border-champagne hover:text-champagne transition-colors"
                  >
                    UPLOAD .JSON FILE
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <textarea
                    value={jsonText}
                    onChange={(e) => parseJsonInput(e.target.value)}
                    placeholder='[{"kind":"flight","model":"Gulfstream G550","capacity":"8"}]'
                    rows={6}
                    className="w-full border border-ivory/15 bg-transparent px-3 py-2 font-mono text-xs text-ivory outline-none placeholder:text-ivory/20 focus:border-champagne/60 resize-none"
                  />
                  {jsonError && (
                    <p className="border border-red-300/30 p-3 text-sm text-red-200">{jsonError}</p>
                  )}
                  {jsonPreview.length > 0 && (
                    <div className="border border-ivory/10 bg-ivory/[0.02] p-3 max-h-40 overflow-y-auto space-y-1">
                      <p className="whisper text-champagne text-[0.6rem] mb-2">
                        {jsonPreview.length} AIRCRAFT READY TO IMPORT
                      </p>
                      {jsonPreview.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-ivory/60">
                          <span
                            className={`whisper text-[0.55rem] px-1.5 border ${a.kind === "flight" ? "border-champagne/30 text-champagne/70" : "border-ivory/20"}`}
                          >
                            {a.kind === "flight" ? "FW" : "RW"}
                          </span>
                          <span className="font-serif text-ivory">{a.model}</span>
                          <span className="ml-auto">{a.capacity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-ivory/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setAddMode("choose")}
                      className="whisper text-ivory/40 hover:text-champagne"
                    >
                      ← BACK
                    </button>
                    <button
                      type="button"
                      onClick={handleJsonImport}
                      disabled={!jsonPreview.length || !!jsonError || importing}
                      className="whisper text-champagne hover:text-ivory disabled:opacity-40"
                    >
                      {importing
                        ? "IMPORTING…"
                        : `IMPORT ${jsonPreview.length > 0 ? `${jsonPreview.length} AIRCRAFT` : ""} →`}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalShell>
  );
}

export const Route = createFileRoute("/admin/aircraft")({
  beforeLoad: () => {
    if (typeof window !== "undefined") return requireRoleAccess(["ADMIN"]);
    return undefined;
  },
  component: AdminAircraft,
});
