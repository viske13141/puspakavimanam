/**
 * Generic Operations page — renders a filterable, paginated table
 * from the shared mock store using a schema definition.
 * Used by most of the 20 Operations routes.
 */
import { useState, type ReactNode } from "react";
import { useOperations } from "@/features/operations/store";
import { OpsLayout } from "@/components/operations/OpsLayout";
import { OperationsProvider } from "@/features/operations/store";
import {
  OpsPageHeader, FilterBar, FilterSelect, OpsTable, OpsTableRow,
  OpsTableCell, StatusBadge, OpsDrawer, DetailRow, OpsTimeline,
  OpsPagination, OpsToast, OpsModal, OpsConfirm,
} from "@/components/operations/shared";
import { schemas, fieldTitle, type Schema } from "@/features/operations/config";
import { find, label, value, type Entry, type Kind } from "@/features/operations/model";

const PER_PAGE = 12;

export function GenericOpsPage({
  pageKey,
  extraActions,
  extraDrawerContent,
  extraFilters,
}: {
  pageKey: string;
  extraActions?: ReactNode;
  extraDrawerContent?: (row: Entry) => ReactNode;
  extraFilters?: ReactNode;
}) {
  const schema = schemas[pageKey];
  if (!schema) return <p className="p-8 text-ivory/40">Page not configured.</p>;

  return (
    <OperationsProvider>
      <GenericOpsPageInner
        pageKey={pageKey}
        schema={schema}
        extraActions={extraActions}
        extraDrawerContent={extraDrawerContent}
        extraFilters={extraFilters}
      />
    </OperationsProvider>
  );
}

function GenericOpsPageInner({
  pageKey,
  schema,
  extraActions,
  extraDrawerContent,
  extraFilters,
}: {
  pageKey: string;
  schema: Schema;
  extraActions?: ReactNode;
  extraDrawerContent?: (row: Entry) => ReactNode;
  extraFilters?: ReactNode;
}) {
  const { state, dispatch } = useOperations();
  const rows = (state.data[schema.kind as Kind] ?? []) as Entry[];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [toast, setToast] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const filtered = rows.filter((row) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      row.name.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q) ||
      Object.values(row.fields).some((fv) => String(fv).toLowerCase().includes(q));
    const matchStatus = !statusFilter || row.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function applyStatus(status: string) {
    if (!selected) return;
    dispatch({
      type: "patch",
      kind: schema.kind as Kind,
      id: selected.id,
      status,
      message: `Status changed to ${status}`,
    });
    setSelected((prev) => (prev ? { ...prev, status } : null));
    setToast(`Status updated to "${status}" — demo only.`);
  }

  return (
    <OpsLayout>
      <OpsPageHeader
        title={schema.kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        description={schema.description}
        actions={extraActions}
      />

      <FilterBar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        filters={
          <>
            <FilterSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={schema.statuses}
              placeholder="All statuses"
            />
            {extraFilters}
          </>
        }
      />

      <OpsTable
        headers={[...schema.columns.map(([, h]: [string, string]) => h), "Actions"]}
        empty={`No ${pageKey} records found.`}
        isEmpty={paged.length === 0}
      >
        {paged.map((row) => (
          <OpsTableRow key={row.id} onClick={() => setSelected(row)}>
            {schema.columns.map(([key]: [string, string]) => (
              <OpsTableCell key={key} muted={key !== "name" && key !== "id"}>
                  {key === "status" ? (
                    <StatusBadge status={row.status} />
                  ) : (
                    <span className={key === "name" || key === "id" ? "font-mono text-champagne/90" : ""}>
                      {label(state.data, row, key) || value(row, key) || "—"}
                    </span>
                  )}
              </OpsTableCell>
            ))}
            <OpsTableCell>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                className="whisper text-[0.55rem] text-ivory/40 hover:text-champagne"
              >
                VIEW
              </button>
            </OpsTableCell>
          </OpsTableRow>
        ))}
      </OpsTable>

      <OpsPagination
        page={page}
        total={filtered.length}
        perPage={PER_PAGE}
        onChange={setPage}
      />

      {/* Detail drawer */}
      <OpsDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={pageKey.toUpperCase().replace(/-/g, " ")}
      >
        {selected && (
          <>
            <DetailRow label="ID" value={selected.id} />
            <DetailRow label="Status" value={selected.status} />
            {Object.entries(selected.fields).map(([k, v]) => (
              <DetailRow key={k} label={fieldTitle(k)} value={String(v)} />
            ))}

            {/* Status change */}
            {schema.statuses.length > 1 && (
              <div className="mt-5">
                <p className="whisper mb-2 text-[0.55rem] text-ivory/30">UPDATE STATUS (DEMO)</p>
                <div className="flex flex-wrap gap-2">
                  {schema.statuses.map((s: string) => (
                    <button
                      key={s}
                      type="button"
                      disabled={s === selected.status}
                      onClick={() => { setPendingStatus(s); setConfirmOpen(true); }}
                      className={`border px-3 py-1 whisper text-[0.55rem] transition-colors disabled:opacity-30 ${
                        s === selected.status
                          ? "border-champagne/40 text-champagne"
                          : "border-ivory/20 text-ivory/50 hover:border-ivory/40 hover:text-ivory"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {extraDrawerContent?.(selected)}

            <div className="mt-5">
              <p className="whisper mb-3 text-[0.55rem] text-ivory/30">ACTIVITY LOG</p>
              <OpsTimeline items={selected.history} />
            </div>
          </>
        )}
      </OpsDrawer>

      <OpsConfirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => applyStatus(pendingStatus)}
        message={`Change status to "${pendingStatus}"? This is a demo-only action and does not affect real operations.`}
      />

      <OpsToast message={toast} onDismiss={() => setToast("")} />
    </OpsLayout>
  );
}
