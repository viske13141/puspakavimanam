import { createContext, useContext, useState, type ReactNode } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  SlidersHorizontal,
  CircleAlert,
  Check,
  ExternalLink,
  Plane,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useOperations } from "./store";
import {
  csv,
  displayRow,
  find,
  label,
  quoteTotal,
  value,
  type Entry,
  type Fields,
  type Kind,
} from "./model";
import { fieldTitle } from "./config";
export function Badge({ children }: { children: ReactNode }) {
  const text = String(children);
  const color =
    /Blocked|Expired|Critical|Declined|Cancelled|Rejected|Exception|Diverted|Restricted/.test(text)
      ? "red"
      : /Ready|Accepted|Completed|Verified|Cleared|Available|Landed|Approved|Read$/.test(text)
        ? "green"
        : /Airborne|Departed|Submitted|Assigned|Review|Progress|Boarding/.test(text)
          ? "blue"
          : "gold";
  return (
    <span className={`av-badge av-${color}`}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}
export function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`av-button ${primary ? "av-primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
export function Empty({
  title = "No matching records",
  detail = "Try a different search or clear your filters.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="av-empty">
      <Search size={24} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="aviation p-8" role="status" aria-label="Loading workspace">
      <div className="av-skeleton h-10 w-72" />
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="av-skeleton h-32" />
        ))}
      </div>
      <div className="av-skeleton mt-8 h-80" />
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="av-notice">
      <CircleAlert size={16} className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}
export function Tabs({
  values,
  selected,
  onChange,
}: {
  values: readonly string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="av-tabs" role="tablist">
      {values.map((v) => (
        <button key={v} role="tab" aria-selected={v === selected} onClick={() => onChange(v)}>
          {v}
        </button>
      ))}
    </div>
  );
}
export function Panel({
  title,
  caption,
  children,
  action,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="av-panel">
      <div className="av-panel-head">
        <div>
          <h2>{title}</h2>
          {caption && <p>{caption}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Timeline({ items }: { items: string[] }) {
  return (
    <ol className="av-timeline">
      {items.map((s, i) => (
        <li key={`${i}-${s}`}>
          <span className="av-timeline-dot" />
          <p>{s}</p>
        </li>
      ))}
    </ol>
  );
}
export function download(name: string, contents: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export interface Column {
  key: string;
  title: string;
}
export function DataTable({
  rows,
  columns,
  kind,
  actions,
  initialQuery = "",
  pageSize = 7,
}: {
  rows: Entry[];
  columns: Column[];
  kind: Kind;
  actions?: (row: Entry) => ReactNode;
  initialQuery?: string;
  pageSize?: number;
}) {
  const {
    state: { data },
  } = useOperations();
  const { inspect } = useWorkspaceUI();
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState({ key: "", desc: false });
  const [page, setPage] = useState(0);
  const enriched = rows.map((r) => displayRow(data, kind, r));
  const filtered = enriched
    .filter((r) =>
      [r.name, r.id, r.status, ...Object.keys(r.fields).map((k) => label(data, r, k))]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort.key
        ? label(data, a, sort.key).localeCompare(label(data, b, sort.key), "en", {
            numeric: true,
          }) * (sort.desc ? -1 : 1)
        : 0,
    );
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  return (
    <div className="av-table-wrap">
      <div className="av-table-toolbar">
        <label className="av-search">
          <Search size={16} />
          <input
            aria-label="Search records"
            placeholder="Search records…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <span className="av-muted">{filtered.length} records</span>
        <Button
          onClick={() =>
            download(
              `viman-demo-${kind}.csv`,
              csv([
                columns.map((c) => c.title),
                ...filtered.map((r) => columns.map((c) => label(data, r, c.key))),
              ]),
            )
          }
        >
          <Download size={14} /> CSV
        </Button>
      </div>
      {filtered.length ? (
        <div className="av-table-scroll" tabIndex={0} aria-label="Scrollable records table">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    aria-sort={
                      sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"
                    }
                  >
                    <button
                      onClick={() =>
                        setSort({ key: c.key, desc: sort.key === c.key && !sort.desc })
                      }
                    >
                      {c.title}
                      <ArrowDownUp size={12} />
                    </button>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(current * pageSize, (current + 1) * pageSize).map((r) => (
                <tr key={r.id}>
                  {columns.map((c, i) => (
                    <td key={c.key}>
                      {/status|assignment|readiness|identity|permission|severity|maintenance|equipment|availability/i.test(
                        c.key,
                      ) ? (
                        <Badge>{label(data, r, c.key)}</Badge>
                      ) : i === 0 ? (
                        <button className="av-record-link" onClick={() => inspect(kind, r.id)}>
                          {label(data, r, c.key)}
                        </button>
                      ) : (
                        <span>{label(data, r, c.key)}</span>
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="av-actions">
                      <button className="av-text-button" onClick={() => inspect(kind, r.id)}>
                        View <ExternalLink size={12} />
                      </button>
                      {actions?.(r)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty action={<Button onClick={() => setQuery("")}>Clear search</Button>} />
      )}
      <div className="av-pagination">
        <span>
          {filtered.length ? current * pageSize + 1 : 0}–
          {Math.min((current + 1) * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div>
          <Button disabled={current === 0} onClick={() => setPage(current - 1)}>
            <ChevronLeft size={14} /> Previous
          </Button>
          <span>
            {current + 1} / {lastPage + 1}
          </span>
          <Button disabled={current === lastPage} onClick={() => setPage(current + 1)}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
export function Filter({
  label: title,
  value: selected,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="av-filter">
      <span>{title}</span>
      <select aria-label={title} value={selected} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {title.toLowerCase()}</option>
        {values.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export interface FormField {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime-local"
    | "time"
    | "select"
    | "checkbox"
    | "file";
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  readOnly?: boolean;
}
export interface FormConfig {
  title: string;
  description?: string;
  fields: FormField[];
  initial?: Fields;
  submit?: string;
  quote?: boolean;
  validate?: (v: Fields) => string | undefined;
  save: (v: Fields) => void;
}
interface UI {
  inspect: (kind: Kind, id: string) => void;
  form: (config: FormConfig) => void;
}
const UIContext = createContext<UI | null>(null);
export function useWorkspaceUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("WorkspaceUIProvider required");
  return ctx;
}
export function WorkspaceUIProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<{ kind: Kind; id: string } | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  return (
    <UIContext.Provider
      value={{
        inspect: (kind, id) => setSelected({ kind, id }),
        form: (config) => setFormConfig(config),
      }}
    >
      {children}
      <RecordDrawer selected={selected} onClose={() => setSelected(null)} />
      {formConfig && <FormDialog config={formConfig} onClose={() => setFormConfig(null)} />}
    </UIContext.Provider>
  );
}
function FormDialog({ config, onClose }: { config: FormConfig; onClose: () => void }) {
  const [fields, setFields] = useState<Fields>(config.initial ?? {});
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="aviation av-modal">
        <DialogTitle>{config.title}</DialogTitle>
        <DialogDescription>
          {config.description ??
            "This action updates fictional data in this workspace only. Nothing is sent to an operator, customer or regulator."}
        </DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const missing = config.fields.find(
              (f) => f.required && f.type !== "checkbox" && !(fields[f.key] ?? "").trim(),
            );
            const problem = missing ? `${missing.label} is required.` : config.validate?.(fields);
            if (problem) {
              setError(problem);
              return;
            }
            if (!confirmed) {
              setConfirmed(true);
              return;
            }
            try {
              config.save(fields);
              toast.success("Demo saved", {
                description: "Local workspace updated. No operational action was submitted.",
              });
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unable to save this demo change.");
            }
          }}
        >
          <div className="av-form-grid">
            {config.fields.map((f) => (
              <label
                key={f.key}
                className={
                  f.type === "textarea" || f.type === "checkbox" ? "av-field av-full" : "av-field"
                }
              >
                <span>
                  {f.label}
                  {f.required ? " *" : ""}
                </span>
                {f.type === "select" ? (
                  <select
                    name={f.key}
                    required={f.required}
                    value={fields[f.key] ?? ""}
                    onChange={(e) => {
                      setFields({ ...fields, [f.key]: e.target.value });
                      setConfirmed(false);
                    }}
                  >
                    <option value="">Select…</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    name={f.key}
                    required={f.required}
                    value={fields[f.key] ?? ""}
                    onChange={(e) => {
                      setFields({ ...fields, [f.key]: e.target.value });
                      setConfirmed(false);
                    }}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    name={f.key}
                    required={f.required}
                    checked={fields[f.key] === "true"}
                    onChange={(e) => {
                      setFields({ ...fields, [f.key]: String(e.target.checked) });
                      setConfirmed(false);
                    }}
                  />
                ) : f.type === "file" ? (
                  <input
                    type="file"
                    name={f.key}
                    required={f.required}
                    onChange={(e) => {
                      setFields({ ...fields, [f.key]: e.target.files?.[0]?.name ?? "" });
                      setConfirmed(false);
                    }}
                  />
                ) : (
                  <input
                    type={f.type ?? "text"}
                    step={f.type === "number" ? "any" : undefined}
                    name={f.key}
                    required={f.required}
                    readOnly={f.readOnly}
                    min={f.min}
                    max={f.max}
                    value={fields[f.key] ?? ""}
                    onChange={(e) => {
                      setFields({ ...fields, [f.key]: e.target.value });
                      setConfirmed(false);
                    }}
                  />
                )}
              </label>
            ))}
          </div>
          {config.quote && (
            <div className="av-total">
              <span>Calculated operator cost · {fields["currency"] || "INR"}</span>
              <strong>
                {quoteTotal(fields).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
              <small>Rate × hours + charges + tax. For Viman review only.</small>
            </div>
          )}
          {error && (
            <p role="alert" className="av-error">
              {error}
            </p>
          )}
          {confirmed && (
            <Notice>Review the values above. Confirm to apply this demo-only change.</Notice>
          )}
          <div className="av-form-footer">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" primary>
              {confirmed ? "Confirm demo change" : (config.submit ?? "Review changes")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function RecordDrawer({
  selected,
  onClose,
}: {
  selected: { kind: Kind; id: string } | null;
  onClose: () => void;
}) {
  const {
    state: { data },
    mode,
  } = useOperations();
  const { inspect } = useWorkspaceUI();
  const entry = selected ? find(data, selected.kind, selected.id) : undefined;
  const row = entry && selected ? displayRow(data, selected.kind, entry) : undefined;
  const linked = selected
    ? data.flights.filter(
        (f) =>
          f.id === selected.id ||
          f.fields["booking"] === selected.id ||
          f.fields["operator"] === selected.id ||
          f.fields["aircraft"] === selected.id ||
          f.id === entry?.fields["flight"],
      )
    : [];
  const refs: Record<string, Kind> = {
    booking: "bookings",
    flight: "flights",
    aircraft: "aircraft",
    operator: "operators",
    site: "sites",
    crew: "crew",
    document: "documents",
    evidence: "documents",
    request: "requests",
  };
  return (
    <Sheet
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="aviation av-drawer">
        <SheetTitle>{row?.name ?? "Record unavailable"}</SheetTitle>
        <SheetDescription>
          Fictional {mode} record · {row?.id ?? "outside current scope"}
        </SheetDescription>
        {row ? (
          <>
            <div className="my-5">
              <Badge>{row.status}</Badge>
            </div>
            {selected?.kind === "documents" && (
              <div className="av-document">
                <FilesIcon />
                <h3>VIMAN · SAMPLE DOCUMENT</h3>
                <p>
                  {row.fields["content"] ||
                    "Fictional preview only. No file contents were uploaded."}
                </p>
                <Button
                  onClick={() =>
                    download(
                      `${row.id}-sample.txt`,
                      `${row.name}\nFICTIONAL SAMPLE — NOT VALID FOR FLIGHT OPERATIONS\n${row.fields["content"] ?? "Metadata-only preview"}`,
                      "text/plain",
                    )
                  }
                >
                  <Download size={14} /> Download sample
                </Button>
              </div>
            )}
            <Panel title="Record details">
              <dl className="av-details">
                {Object.entries(row.fields)
                  .filter(([k]) => !["content", "messages", "checklist"].includes(k))
                  .map(([key, val]) => (
                    <div key={key}>
                      <dt>{fieldTitle(key)}</dt>
                      <dd>
                        {refs[key] && find(data, refs[key]!, val) ? (
                          <button
                            className="av-text-button"
                            onClick={() => inspect(refs[key]!, val)}
                          >
                            {label(data, row, key)} <ExternalLink size={12} />
                          </button>
                        ) : (
                          label(data, row, key)
                        )}
                      </dd>
                    </div>
                  ))}
              </dl>
            </Panel>
            {linked.length > 0 && (
              <Panel title="Related flight itinerary">
                <div className="av-list">
                  {linked.map((f) => (
                    <button key={f.id} onClick={() => inspect("flights", f.id)}>
                      <span>
                        <strong>{f.name}</strong>
                        <small>
                          {displayRow(data, "flights", f).fields["route"]} · {f.fields["date"]} ·{" "}
                          {f.fields["departure"]}
                        </small>
                      </span>
                      <Badge>{f.status}</Badge>
                    </button>
                  ))}
                </div>
              </Panel>
            )}
            {selected?.kind === "bookings" && (
              <Panel title="Passenger list">
                <div className="av-list">
                  {data.passengers
                    .filter((p) => p.fields["booking"] === row.id)
                    .map((p) => (
                      <button key={p.id} onClick={() => inspect("passengers", p.id)}>
                        {p.name}
                        <Badge>{p.status}</Badge>
                      </button>
                    ))}
                </div>
              </Panel>
            )}
            <Panel title="Activity timeline">
              <Timeline items={row.history} />
            </Panel>
            <Notice>
              Demo evidence and status labels do not constitute regulatory approval, operational
              clearance or medical clearance.
            </Notice>
          </>
        ) : (
          <Empty
            title="Record unavailable"
            detail="This record is not in the active mock company scope."
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
function FilesIcon() {
  return <Plane size={36} className="mx-auto text-champagne" />;
}
