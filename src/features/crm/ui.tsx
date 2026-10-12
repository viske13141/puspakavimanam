import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { downloadCsv } from "./repository";
import { useCrm } from "./store";
export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`crm-btn ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  const text = String(children);
  return (
    <span
      className={`crm-badge ${/Confirmed|Qualified|Active|Completed|Booked|Accepted|Ready|Imported/.test(text) ? "green" : /Lost|Overdue|High|Failed|Cancelled|Rejected/.test(text) ? "red" : /New|Draft|Pending|Medium|Progress/.test(text) ? "gold" : ""}`}
    >
      {children}
    </span>
  );
}
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`crm-panel ${className}`}>
      {title && (
        <header className="crm-panel-head">
          <h2>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Modal({
  title,
  description = "Changes are stored in this browser’s demo workspace.",
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`crm-modal ${wide ? "crm-modal-wide" : ""}`}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="crm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Select({
  value,
  onChange,
  options,
  label,
  all,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
  all?: string;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {all !== undefined && <option value="">{all}</option>}
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
export function Empty({
  text = "No matching records",
  children,
}: {
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="crm-empty">
      <Search size={28} />
      <h3>{text}</h3>
      <p>Try adjusting your filters or add a new record.</p>
      {children}
    </div>
  );
}
export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  value?: (row: T) => string | number;
}
export function Table<T extends { id: string }>({
  rows,
  columns,
  onOpen,
  actions,
  selected,
  onSelect,
  label = "records",
}: {
  rows: T[];
  columns: Column<T>[];
  onOpen?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  selected?: string[];
  onSelect?: (ids: string[]) => void;
  label?: string;
}) {
  const { data, mutate } = useCrm();
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState(""),
    [desc, setDesc] = useState(false),
    [page, setPage] = useState(0),
    [size, setSize] = useState(10),
    [hidden, setHidden] = useState<string[]>(label === "leads" ? data.settings.columns : []),
    [showCols, setShowCols] = useState(false);
  const val = (r: T, c: Column<T>) => {
    if (c.value) return c.value(r);
    const raw = (r as Record<string, unknown>)[c.key];
    return typeof raw === "number" ? raw : String(raw ?? "");
  };
  const filtered = useMemo(() => {
    let result = rows.filter((r) =>
      columns.some((c) => String(val(r, c)).toLowerCase().includes(search.toLowerCase())),
    );
    const col = columns.find((c) => c.key === sort);
    if (col)
      result = [...result].sort((a, b) => {
        const x = val(a, col),
          y = val(b, col);
        return (
          (typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y))) * (desc ? -1 : 1)
        );
      });
    return result;
  }, [rows, search, sort, desc, columns]);
  useEffect(() => setPage(0), [search, size, rows.length]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * size, (current + 1) * size);
  const visible = columns.filter((c) => !hidden.includes(c.key));
  return (
    <Panel>
      <div className="crm-table-tools">
        <label className="crm-search">
          <Search size={16} />
          <input
            aria-label={`Search ${label}`}
            placeholder={`Search ${label}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="crm-muted">{filtered.length} records</span>
        <Button onClick={() => setShowCols(!showCols)}>
          <SlidersHorizontal size={15} />
          Columns
        </Button>
        <Button
          onClick={() =>
            downloadCsv(
              label,
              filtered.map((r) => Object.fromEntries(visible.map((c) => [c.label, val(r, c)]))),
              visible.map((c) => c.label),
            )
          }
        >
          <Download size={15} />
          Export
        </Button>
      </div>
      {showCols && (
        <div className="crm-filterbar">
          {columns.map((c) => (
            <label key={c.key}>
              <input
                type="checkbox"
                checked={!hidden.includes(c.key)}
                onChange={() => {
                  const next = hidden.includes(c.key)
                    ? hidden.filter((k) => k !== c.key)
                    : [...hidden, c.key];
                  if (label === "leads")
                    void mutate((d) => {
                      d.settings.columns = next;
                    }, "").then((ok) => {
                      if (ok) setHidden(next);
                    });
                  else setHidden(next);
                }}
              />{" "}
              {c.label}
            </label>
          ))}
        </div>
      )}
      <div className="crm-table-scroll">
        <table>
          <thead>
            <tr>
              {onSelect && (
                <th>
                  <input
                    aria-label="Select visible rows"
                    type="checkbox"
                    checked={shown.length > 0 && shown.every((r) => selected?.includes(r.id))}
                    onChange={(e) =>
                      onSelect(
                        e.target.checked
                          ? [...new Set([...(selected ?? []), ...shown.map((r) => r.id)])]
                          : (selected ?? []).filter((id) => !shown.some((r) => r.id === id)),
                      )
                    }
                  />
                </th>
              )}
              {visible.map((c) => (
                <th key={c.key}>
                  <button
                    onClick={() => {
                      setSort(c.key);
                      setDesc(sort === c.key ? !desc : false);
                    }}
                  >
                    {c.label}
                    <ArrowUpDown size={11} />
                  </button>
                </th>
              ))}
              {(actions || onOpen) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                {onSelect && (
                  <td>
                    <input
                      aria-label={`Select ${r.id}`}
                      type="checkbox"
                      checked={selected?.includes(r.id) ?? false}
                      onChange={(e) =>
                        onSelect(
                          e.target.checked
                            ? [...(selected ?? []), r.id]
                            : (selected ?? []).filter((id) => id !== r.id),
                        )
                      }
                    />
                  </td>
                )}
                {visible.map((c, i) => (
                  <td key={c.key}>
                    {i === 0 && onOpen ? (
                      <button className="crm-text-link" onClick={() => onOpen(r)}>
                        {c.render ? c.render(r) : String(val(r, c))}
                      </button>
                    ) : c.render ? (
                      c.render(r)
                    ) : (
                      String(val(r, c))
                    )}
                  </td>
                ))}
                {(actions || onOpen) && (
                  <td>
                    {actions ? actions(r) : <Button onClick={() => onOpen?.(r)}>View</Button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && <Empty />}
      <footer className="crm-table-footer">
        <span>
          Showing {filtered.length ? current * size + 1 : 0}–
          {Math.min((current + 1) * size, filtered.length)} of {filtered.length}
        </span>
        <select
          aria-label="Rows per page"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
        <Button
          aria-label="Previous page"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span>
          {current + 1} / {pages}
        </span>
        <Button
          aria-label="Next page"
          disabled={current + 1 === pages}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </footer>
    </Panel>
  );
}
