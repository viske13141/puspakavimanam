import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

// ── Status badge ──────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  // Flight
  Scheduled: "border-blue-400/30 bg-blue-900/10 text-blue-300",
  Preparing: "border-yellow-400/30 bg-yellow-900/10 text-yellow-300",
  Ready: "border-emerald-400/30 bg-emerald-900/10 text-emerald-300",
  Boarding: "border-cyan-400/30 bg-cyan-900/10 text-cyan-300",
  Departed: "border-indigo-400/30 bg-indigo-900/10 text-indigo-300",
  Airborne: "border-violet-400/30 bg-violet-900/10 text-violet-300",
  Landed: "border-teal-400/30 bg-teal-900/10 text-teal-300",
  Completed: "border-green-400/30 bg-green-900/10 text-green-300",
  Delayed: "border-orange-400/30 bg-orange-900/10 text-orange-300",
  Cancelled: "border-red-400/30 bg-red-900/10 text-red-300",
  Diverted: "border-pink-400/30 bg-pink-900/10 text-pink-300",
  // Assignment
  Unassigned: "border-ivory/20 bg-white/[0.02] text-ivory/40",
  "Assignment Requested": "border-yellow-400/30 bg-yellow-900/10 text-yellow-300",
  "Operator Reviewing": "border-blue-400/30 bg-blue-900/10 text-blue-300",
  Accepted: "border-green-400/30 bg-green-900/10 text-green-300",
  Declined: "border-red-400/30 bg-red-900/10 text-red-300",
  "Reassignment Required": "border-orange-400/30 bg-orange-900/10 text-orange-300",
  // Handover
  "Awaiting Review": "border-yellow-400/30 bg-yellow-900/10 text-yellow-300",
  "Under Review": "border-blue-400/30 bg-blue-900/10 text-blue-300",
  "Clarification Required": "border-orange-400/30 bg-orange-900/10 text-orange-300",
  "On Hold": "border-ivory/20 bg-white/[0.02] text-ivory/50",
  // Compliance / docs
  Pending: "border-yellow-400/30 bg-yellow-900/10 text-yellow-300",
  "Evidence Submitted": "border-blue-400/30 bg-blue-900/10 text-blue-300",
  Verified: "border-green-400/30 bg-green-900/10 text-green-300",
  Expired: "border-red-400/30 bg-red-900/10 text-red-300",
  "Exception Open": "border-orange-400/30 bg-orange-900/10 text-orange-300",
  Escalated: "border-pink-400/30 bg-pink-900/10 text-pink-300",
  // Check
  "Not Started": "border-ivory/20 bg-white/[0.02] text-ivory/40",
  "In Progress": "border-blue-400/30 bg-blue-900/10 text-blue-300",
  Submitted: "border-cyan-400/30 bg-cyan-900/10 text-cyan-300",
  Blocked: "border-red-400/30 bg-red-900/10 text-red-300",
  "Not Applicable": "border-ivory/10 bg-white/[0.01] text-ivory/25",
  // Misc
  Available: "border-green-400/30 bg-green-900/10 text-green-300",
  Assigned: "border-blue-400/30 bg-blue-900/10 text-blue-300",
  "In Flight": "border-violet-400/30 bg-violet-900/10 text-violet-300",
  Maintenance: "border-orange-400/30 bg-orange-900/10 text-orange-300",
  Unavailable: "border-red-400/30 bg-red-900/10 text-red-300",
  Restricted: "border-orange-400/30 bg-orange-900/10 text-orange-300",
  Active: "border-green-400/30 bg-green-900/10 text-green-300",
  Cleared: "border-green-400/30 bg-green-900/10 text-green-300",
  Open: "border-orange-400/30 bg-orange-900/10 text-orange-300",
  Coordinating: "border-blue-400/30 bg-blue-900/10 text-blue-300",
  Unread: "border-champagne/30 bg-champagne/10 text-champagne",
  Read: "border-ivory/10 bg-white/[0.02] text-ivory/40",
  "Review Required": "border-orange-400/30 bg-orange-900/10 text-orange-300",
  "Verified · demo": "border-green-400/30 bg-green-900/10 text-green-300",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = statusColors[status] ?? "border-ivory/20 text-ivory/50";
  return (
    <span className={`whisper inline-block border px-2 py-0.5 text-[0.55rem] ${cls}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ── KPI stat card ─────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  icon,
  color = "champagne",
  onClick,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  color?: "champagne" | "green" | "orange" | "red" | "blue" | "violet";
  onClick?: () => void;
}) {
  const colorMap = {
    champagne: "text-champagne border-champagne/20",
    green: "text-green-300 border-green-400/20",
    orange: "text-orange-300 border-orange-400/20",
    red: "text-red-300 border-red-400/20",
    blue: "text-blue-300 border-blue-400/20",
    violet: "text-violet-300 border-violet-400/20",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`border border-ivory/10 bg-white/[0.02] p-4 text-left transition-colors ${onClick ? "hover:bg-white/[0.04] cursor-pointer" : ""}`}
    >
      <div className={`mb-2 flex items-center gap-2 ${colorMap[color]}`}>
        {icon}
        <span className="whisper text-[0.55rem] tracking-[0.25em]">{label.toUpperCase()}</span>
      </div>
      <p className={`font-serif text-3xl font-light ${colorMap[color].split(" ")[0]}`}>{value}</p>
    </Tag>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
export function OpsPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="font-serif text-2xl font-light text-ivory">{title}</h2>
        {description && <p className="mt-1 text-xs text-ivory/40">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
export function FilterBar({
  search,
  onSearch,
  filters,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search…"
        className="field min-w-[180px] flex-1 md:max-w-xs"
      />
      {filters}
    </div>
  );
}

// ── Simple select filter ──────────────────────────────────────────────────────
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field w-40"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────
export function OpsTable({
  headers,
  children,
  empty,
  isEmpty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="overflow-x-auto border border-ivory/10">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-ivory/10">
            {headers.map((h) => (
              <th key={h} className="whisper px-4 py-3 font-normal text-ivory/40">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {isEmpty && (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-12 text-center font-serif italic text-ivory/30"
              >
                {empty ?? "No records found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function OpsTableRow({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-ivory/[0.06] transition-colors ${onClick ? "cursor-pointer hover:bg-ivory/[0.03]" : ""}`}
    >
      {children}
    </tr>
  );
}

export function OpsTableCell({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <td className={`px-4 py-3 ${muted ? "text-ivory/40" : "text-ivory/80"}`}>{children}</td>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
export function OpsDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-obsidian/70 backdrop-blur-sm" />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: "tween", duration: 0.28 }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-ivory/10 bg-[oklch(0.11_0.008_275)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-ivory/10 px-6 py-5">
              <div>
                <p className="whisper text-[0.55rem] text-champagne">{subtitle}</p>
                <h3 className="mt-1 font-serif text-xl font-light text-ivory">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xl text-ivory/40 hover:text-champagne"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function OpsModal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="relative z-10 w-full max-w-lg border border-ivory/15 bg-[oklch(0.10_0.008_275)] p-7 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between border-b border-ivory/10 pb-5">
              <div>
                {subtitle && <p className="whisper text-[0.55rem] text-champagne">{subtitle}</p>}
                <h3 className="mt-1 font-serif text-2xl font-light text-ivory">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xl text-ivory/40 hover:text-champagne"
              >
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────
export function DetailRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex gap-4 border-b border-ivory/[0.06] py-2.5">
      <dt className="w-36 shrink-0 whisper text-[0.55rem] text-ivory/40">{label.toUpperCase()}</dt>
      <dd className="break-words text-xs text-ivory/80">{value || "—"}</dd>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
export function OpsTimeline({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full border border-champagne/60 bg-champagne/20" />
            {i < items.length - 1 && <span className="mt-1 w-px flex-1 bg-ivory/10" />}
          </div>
          <p className="pb-3 text-xs text-ivory/60">{item}</p>
        </li>
      ))}
    </ol>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function OpsEmpty({ message }: { message: string }) {
  return (
    <div className="border border-ivory/10 bg-white/[0.02] p-12 text-center">
      <p className="font-serif italic text-ivory/30">{message}</p>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
export function OpsConfirm({
  open,
  onClose,
  onConfirm,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}) {
  return (
    <OpsModal open={open} onClose={onClose} title="Confirm action" subtitle="DEMO ONLY">
      <p className="mb-6 text-sm text-ivory/70">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-ivory/20 px-4 py-2.5 whisper text-ivory/50 hover:text-ivory"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={() => { onConfirm(); onClose(); }}
          className="flex-1 border border-champagne/40 bg-champagne/10 px-4 py-2.5 whisper text-champagne hover:bg-champagne/20"
        >
          CONFIRM
        </button>
      </div>
    </OpsModal>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function OpsToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 border border-champagne/30 bg-[oklch(0.12_0.008_275)] px-5 py-3 shadow-xl"
        >
          <span className="text-xs text-ivory/80">{message}</span>
          <button type="button" onClick={onDismiss} className="text-ivory/40 hover:text-champagne">
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function OpsPagination({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="whisper text-[0.55rem] text-ivory/30">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="border border-ivory/15 px-3 py-1 whisper text-[0.55rem] text-ivory/50 disabled:opacity-30 hover:border-ivory/40 hover:text-ivory"
        >
          ← PREV
        </button>
        <button
          type="button"
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
          className="border border-ivory/15 px-3 py-1 whisper text-[0.55rem] text-ivory/50 disabled:opacity-30 hover:border-ivory/40 hover:text-ivory"
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}


