import { MoreHorizontal } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useOperations } from "./store";
import { useWorkspaceUI, download, type FormField } from "./ui";
import { assignmentStatuses, checkStatuses, fieldTitle, schemas, operatorSchemas } from "./config";
import {
  DEMO_DATE,
  conflicts,
  find,
  quoteTotal,
  type Entry,
  type Fields,
  type Kind,
} from "./model";
export const checkinItems = [
  "Identity matches manifest",
  "Original document verified",
  "Body weight measured",
  "Hand baggage weighed",
  "Safety briefing completed",
  "Required medical documents checked",
  "Baggage restrictions reviewed",
];
const options = (values: string[]) => values.map((value) => ({ value, label: value }));
export function useRecordActions() {
  const {
    state: { data, revision },
    dispatch,
    mode,
    company,
  } = useOperations();
  const ui = useWorkspaceUI();
  const navigate = useNavigate();
  const go = (page: string, query = "") =>
    void navigate({ to: `/${mode}/${page}`, search: { q: query } });
  function spec(key: string, kind: Kind, statuses?: string[]): FormField {
    const refs: Record<string, Kind> = {
      flight: "flights",
      proposedFlight: "flights",
      booking: "bookings",
      operator: "operators",
      aircraft: "aircraft",
      crew: "crew",
      request: "requests",
      evidence: "documents",
      document: "documents",
    };
    const choices: Record<string, string[]> = {
      status: statuses ?? [],
      priority: ["Normal", "High", "Urgent"],
      assignment: assignmentStatuses,
      service: ["Helicopter", "Private Jet"],
      type:
        kind === "aircraft" || kind === "requests"
          ? ["Helicopter", "Private Jet"]
          : kind === "incidents"
            ? ["Incident", "Diversion"]
            : [],
      role: ["Pilot-in-Command", "Co-Pilot", "Cabin Crew", "Medical Crew", "Ground Crew"],
      confirmation: ["Awaiting response", "Confirmed · demo", "Declined · demo"],
      currency: ["INR", "USD", "EUR"],
      severity: ["Low", "Medium", "High", "Critical"],
      equipment: ["Check Pending", "Evidence Submitted", "Issue Flagged"],
      ambulance: ["Pending", "Coordinated", "Blocked"],
      permission: ["Pending", "Requested · demo", "Evidence submitted", "Issue Flagged"],
      identity: ["Review Required", "Evidence received", "Reviewed · demo", "Discrepancy Flagged"],
    };
    const ref = refs[key];
    if (ref)
      return {
        key,
        label: fieldTitle(key),
        type: "select",
        options: data[ref].map((r) => ({ value: r.id, label: r.name })),
        required: !["evidence", "document"].includes(key),
      };
    if (choices[key]?.length)
      return {
        key,
        label: fieldTitle(key),
        type: "select",
        options: options(choices[key]!),
        required: true,
      };
    return {
      key,
      label: fieldTitle(key),
      type: /notes|reason|description|terms|instructions|care|requirements|immediateActions/i.test(
        key,
      )
        ? "textarea"
        : /Date|date|Expiry|expiry|validUntil/.test(key)
          ? "date"
          : ["start", "end", "reported", "due"].includes(key)
            ? "datetime-local"
            : /Time|[Dd]eparture|[Aa]rrival/.test(key)
              ? "time"
              : /Rate|hours|positioning|landing|handling|other|tax|capacity|Weight/.test(key)
                ? "number"
                : "text",
      required: !["notes", "evidence", "document"].includes(key),
      min: 0,
    };
  }
  function patch(kind: Kind, row: Entry, fields: Fields, message: string, status?: string) {
    dispatch({ type: "patch", kind, id: row.id, fields, message, ...(status ? { status } : {}) });
  }
  function edit(kind: Kind, row: Entry, keys: string[], title: string, statuses?: string[]) {
    ui.form({
      title,
      fields: keys.map((k) => spec(k, kind, statuses)),
      initial: { ...row.fields, name: row.name, status: row.status },
      save: (values) => {
        const fields = Object.fromEntries(
          keys.filter((k) => k !== "name" && k !== "status").map((k) => [k, values[k] ?? ""]),
        );
        if (kind === "checks")
          fields["updated"] =
            new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " ? demo";
        dispatch({
          type: "patch",
          kind,
          id: row.id,
          fields,
          message: title,
          ...(keys.includes("name") ? { name: values["name"]?.trim() || row.name } : {}),
          ...(keys.includes("status") ? { status: values["status"] ?? row.status } : {}),
        });
      },
    });
  }
  function create(
    kind: Kind,
    title: string,
    keys: string[],
    statuses: string[],
    initial: Fields = {},
  ) {
    ui.form({
      title,
      fields: keys.map((k) => spec(k, kind, statuses)),
      initial: { status: statuses[0] ?? "Pending", ...initial },
      validate: (values) =>
        kind === "aircraft" &&
        data.aircraft.some(
          (a) =>
            a.fields["registration"]?.toLowerCase() ===
            values["registration"]?.trim().toLowerCase(),
        )
          ? "This registration already exists in this company."
          : undefined,
      save: (values) => {
        const entry: Entry = {
          id: `${kind.toUpperCase()}-DEMO-${crypto.randomUUID().slice(0, 8)}`,
          name: values["name"]?.trim() || title,
          status:
            kind === "aircraft" ? "Pending Approval" : values["status"] || statuses[0] || "Pending",
          fields: {
            ...values,
            operator: mode === "operator" ? company : (values["operator"] ?? ""),
          },
          history: [
            `Demo created · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
          ],
        };
        dispatch({ type: "add", kind, entry });
        if (kind === "incidents" && values["type"] === "Diversion") {
          const flight = find(data, "flights", values["flight"]);
          if (flight)
            patch(
              "flights",
              flight,
              {
                diversion: values["revisedDestination"] ?? "",
                reason: values["reason"] ?? "",
                lastUpdate: "Diversion recorded ? demo",
              },
              "Demo diversion record linked",
              "Diverted",
            );
        }
      },
    });
  }
  function handover(row: Entry) {
    ui.form({
      title: `Accept handover · ${row.name}`,
      fields: [
        spec("coordinator", "bookings"),
        spec("priority", "bookings"),
        spec("notes", "bookings"),
        ...[
          "Itinerary reviewed",
          "Manifest reviewed",
          "Payment confirmation reviewed (read-only)",
        ].map((label, i): FormField => ({
          key: `check${i}`,
          label,
          type: "checkbox",
          required: true,
        })),
      ],
      initial: row.fields,
      save: (v) =>
        patch(
          "bookings",
          row,
          {
            coordinator: v["coordinator"]!,
            priority: v["priority"]!,
            notes: v["notes"] ?? "",
            checklist: "0,1,2",
          },
          "Handover accepted in demo",
          "Accepted",
        ),
    });
  }
  function assign(row: Entry) {
    ui.form({
      title: `Assign operator · ${row.name}`,
      description: `${row.fields["date"]} · Demo assignment request. No operator is notified.`,
      fields: [
        spec("operator", "flights"),
        spec("aircraft", "flights"),
        spec("priority", "flights"),
        spec("instructions", "flights"),
        spec("notes", "flights"),
      ],
      initial: row.fields,
      validate: (v) =>
        find(data, "aircraft", v["aircraft"])?.fields["operator"] !== v["operator"]
          ? "Select an aircraft belonging to the selected operator."
          : undefined,
      save: (v) =>
        patch(
          "flights",
          row,
          {
            operator: v["operator"]!,
            aircraft: v["aircraft"]!,
            priority: v["priority"]!,
            instructions: v["instructions"]!,
            notes: v["notes"] ?? "",
            assignment: "Assignment Requested",
          },
          "Assignment created · notification simulated · aircraft proposed",
        ),
    });
  }
  function schedule(row: Entry) {
    ui.form({
      title: `${mode === "operator" ? "Request schedule change" : "Simulate rescheduling"} · ${row.name}`,
      description:
        "This is an unapproved demo proposal. It is not an authorized operational schedule change.",
      fields: [
        spec("proposedDate", "flights"),
        spec("proposedTime", "flights"),
        spec("reason", "flights"),
        spec("notes", "flights"),
        spec("confirmation", "flights"),
        {
          key: "ackConflict",
          label: "Acknowledge any mock overlap warning (does not approve an operational conflict)",
          type: "checkbox",
        },
      ],
      initial: {
        ...row.fields,
        proposedDate: row.fields["date"]!,
        proposedTime: row.fields["departure"]!,
      },
      validate: (v) =>
        conflicts(data, row, v["proposedDate"]!, v["proposedTime"]!).length &&
        v["ackConflict"] !== "true"
          ? "Aircraft overlap detected. Review the calendar; acknowledge this warning to save an unapproved demo proposal."
          : undefined,
      save: (v) => {
        const fields: Fields = {
          proposedDate: v["proposedDate"]!,
          proposedTime: v["proposedTime"]!,
          reason: v["reason"]!,
          notes: v["notes"] ?? "",
          confirmation: v["confirmation"]!,
          scheduleProposal: "Unapproved · demo",
        };
        if (mode === "operations") {
          fields["date"] = v["proposedDate"]!;
          fields["departure"] = v["proposedTime"]!;
          const arrival = new Date(`${v["proposedDate"]}T${v["proposedTime"]}:00Z`);
          arrival.setUTCMinutes(arrival.getUTCMinutes() + Number(row.fields["duration"] || 60));
          fields["arrival"] = arrival.toISOString().slice(11, 16);
        }
        patch("flights", row, fields, "Unapproved schedule proposal recorded in demo");
      },
    });
  }
  function block(row?: Entry) {
    const existing = row && data.blocks.find((b) => b.fields["aircraft"] === row.id);
    ui.form({
      title: existing ? "Edit availability block" : "Record availability block",
      fields: [
        spec("aircraft", "blocks"),
        spec("start", "blocks"),
        spec("end", "blocks"),
        {
          key: "status",
          label: "Block type",
          type: "select",
          required: true,
          options: options(["Reserved", "Maintenance", "Unavailable"]),
        },
        spec("reason", "blocks"),
        spec("notes", "blocks"),
        {
          key: "ackConflict",
          label: "Acknowledge overlap warnings for this demo block",
          type: "checkbox",
        },
      ],
      initial: existing
        ? { ...existing.fields, status: existing.status }
        : {
            aircraft: row?.id ?? "",
            start: `${DEMO_DATE}T12:00`,
            end: `${DEMO_DATE}T15:00`,
            status: "Maintenance",
          },
      validate: (v) => {
        if (!v["start"] || !v["end"] || v["end"] <= v["start"]) return "End must be after start.";
        const overlap = data.flights.some(
          (f) =>
            f.fields["aircraft"] === v["aircraft"] &&
            Date.parse(`${f.fields["date"]}T${f.fields["departure"]}:00`) < Date.parse(v["end"]!) &&
            Date.parse(`${f.fields["date"]}T${f.fields["departure"]}:00`) +
              Number(f.fields["duration"] || 60) * 60000 >
              Date.parse(v["start"]!),
        );
        return overlap && v["ackConflict"] !== "true"
          ? "This block overlaps a flight assignment. Acknowledge to record the demo conflict."
          : undefined;
      },
      save: (v) => {
        if (existing) patch("blocks", existing, v, "Availability block updated", v["status"]);
        else
          dispatch({
            type: "add",
            kind: "blocks",
            entry: {
              id: `BLOCK-${crypto.randomUUID()}`,
              name: v["reason"]!,
              status: v["status"]!,
              fields: {
                ...v,
                operator:
                  mode === "operator"
                    ? company
                    : (find(data, "aircraft", v["aircraft"])?.fields["operator"] ?? ""),
              },
              history: ["Availability block created · demo"],
            },
          });
      },
    });
  }
  function checkin(row: Entry) {
    ui.form({
      title: `Demo check-in · ${row.name}`,
      description:
        "Fictional passenger clearance for UI testing only. This does not authorize boarding.",
      fields: [
        spec("bodyWeight", "passengers"),
        spec("baggageWeight", "passengers"),
        ...checkinItems.map((label, i): FormField => ({
          key: `check${i}`,
          label,
          type: "checkbox",
        })),
        spec("status", "passengers", ["Pending", "Under Review", "Cleared", "Blocked"]),
        spec("notes", "passengers"),
      ],
      initial: {
        ...row.fields,
        status: row.status,
        ...Object.fromEntries(
          checkinItems.map((_, i) => [
            `check${i}`,
            String((row.fields["checklist"] ?? "").split(",").includes(String(i))),
          ]),
        ),
      },
      validate: (v) =>
        v["status"] === "Cleared" &&
        (Number(v["bodyWeight"]) <= 0 || checkinItems.some((_, i) => v[`check${i}`] !== "true"))
          ? "Demo clearance requires all seven checks and a positive measured body weight."
          : undefined,
      save: (v) =>
        patch(
          "passengers",
          row,
          {
            bodyWeight: v["bodyWeight"]!,
            baggageWeight: v["baggageWeight"]!,
            notes: v["notes"] ?? "",
            checklist: checkinItems
              .map((_, i) => String(i))
              .filter((i) => v[`check${i}`] === "true")
              .join(","),
          },
          "Check-in reviewed · demo-only",
          v["status"],
        ),
    });
  }
  function quote(row?: Entry, request?: Entry, duplicate = false) {
    ui.form({
      title: row && !duplicate ? `Edit draft · ${row.name}` : "Create quotation draft",
      description: "Operator costs for Viman only. No quote is sent to a customer.",
      quote: true,
      fields: [
        spec("request", "quotes"),
        spec("aircraft", "quotes"),
        ...["hourlyRate", "hours", "positioning", "landing", "handling", "other", "tax"].map((k) =>
          spec(k, "quotes"),
        ),
        spec("currency", "quotes"),
        spec("validUntil", "quotes"),
        spec("notes", "quotes"),
        spec("terms", "quotes"),
      ],
      initial: {
        hourlyRate: "85000",
        hours: "1",
        positioning: "0",
        landing: "0",
        handling: "0",
        other: "0",
        tax: "5",
        currency: "INR",
        validUntil: "2026-10-15",
        ...row?.fields,
        ...(request ? { request: request.id } : {}),
      },
      validate: (v) =>
        !Number.isFinite(quoteTotal(v)) || quoteTotal(v) <= 0
          ? "Enter a positive finite quotation amount."
          : undefined,
      save: (v) => {
        const req = find(data, "requests", v["request"])!;
        const fields = {
          ...v,
          operator: company,
          origin: req.fields["origin"]!,
          destination: req.fields["destination"]!,
          date: req.fields["date"]!,
        };
        if (row && !duplicate) patch("quotes", row, fields, "Draft costs revised", "Draft");
        else
          dispatch({
            type: "add",
            kind: "quotes",
            entry: {
              id: `QUOTE-${crypto.randomUUID()}`,
              name: `VQ-DEMO-${revision + 1}`,
              status: "Draft",
              fields,
              history: ["Draft created locally for Viman"],
            },
          });
      },
    });
  }
  function submitQuote(row: Entry) {
    ui.form({
      title: `Submit ${row.name} to Viman · simulation`,
      fields: [
        {
          key: "confirm",
          label: "Submit this operator cost quotation to the demo Viman review queue",
          type: "checkbox",
          required: true,
        },
      ],
      save: () => {
        patch("quotes", row, {}, "Submitted to Viman · simulation only", "Submitted");
        const req = find(data, "requests", row.fields["request"]);
        if (req) patch("requests", req, {}, "Quotation submitted in demo", "Quote Submitted");
      },
    });
  }
  function incident(type: string, flight?: Entry) {
    create(
      "incidents",
      `Record ${type.toLowerCase()} · demo`,
      [
        "name",
        "flight",
        ...(type === "Diversion"
          ? [
              "originalDestination",
              "revisedDestination",
              "reason",
              "reported",
              "pic",
              "atc",
              "dispatch",
              "care",
              "permission",
            ]
          : [
              "category",
              "severity",
              "reporter",
              "reported",
              "description",
              "immediateActions",
              "reviewer",
              "escalation",
            ]),
        "notes",
        "status",
      ],
      ["Open", "Under Review", "Escalated", "Closed"],
      { type, flight: flight?.id ?? "", reported: `${DEMO_DATE}T10:30` },
    );
  }
  function upload(flight?: string) {
    ui.form({
      title: "Add mock document metadata",
      description:
        "Only the filename is retained in memory. File contents are not read or uploaded.",
      fields: [
        { key: "filename", label: "Choose a fictional sample file", type: "file", required: true },
        spec("category", "documents"),
        spec("flight", "documents"),
        spec("expiry", "documents"),
        spec("notes", "documents"),
      ],
      initial: { flight: flight ?? "", expiry: "2027-01-01" },
      save: (v) =>
        dispatch({
          type: "add",
          kind: "documents",
          entry: {
            id: `DOC-${crypto.randomUUID()}`,
            name: v["filename"]!,
            status: "Pending",
            fields: {
              ...v,
              operator: company,
              uploadedBy: "Demo coordinator",
              uploaded: DEMO_DATE,
              content: "Metadata-only demo. No file content has been stored.",
            },
            history: ["Mock filename added · verification pending"],
          },
        }),
    });
  }
  function message(row: Entry) {
    ui.form({
      title: `Message ${row.name} · simulation`,
      fields: [spec("notes", "operators")],
      save: (v) =>
        patch("operators", row, { notes: v["notes"] ?? "" }, "Message recorded locally; not sent"),
    });
  }
  function actions(kind: Kind, row: Entry): [string, () => void][] {
    const note: [string, () => void] = [
      "Add notes",
      () => edit(kind, row, ["notes"], "Add operational notes"),
    ];
    switch (kind) {
      case "bookings":
        return mode === "operations"
          ? [
              ["Accept handover", () => handover(row)],
              [
                "Request clarification",
                () =>
                  edit(kind, row, ["status", "notes"], "Request handover clarification", [
                    "Clarification Required",
                    "On Hold",
                    "Under Review",
                  ]),
              ],
              [
                "Assign coordinator",
                () =>
                  edit(
                    kind,
                    row,
                    ["coordinator", "priority", "notes"],
                    "Assign operations coordinator",
                  ),
              ],
              ["View passengers", () => go("passengers", row.name)],
              ["View documents", () => go("documents", row.name)],
            ]
          : [
              ["View schedule", () => go("schedule", row.name)],
              ["View manifest", () => go("passengers", row.name)],
              [
                "Open preparation",
                () =>
                  go(
                    "preparation",
                    data.flights.find((f) => f.fields["booking"] === row.id)?.id ?? "",
                  ),
              ],
              ["Flight updates", () => go("flights", row.name)],
            ];
      case "operators":
        return [
          ["View fleet", () => go("aircraft", row.name)],
          ["View assignments", () => go("assignments", row.name)],
          ["Send mock message", () => message(row)],
          ["View documents", () => go("documents", row.name)],
        ];
      case "aircraft":
        return [
          ["View schedule", () => go("schedule", row.name)],
          [
            "Check availability",
            () => go(mode === "operator" ? "availability" : "schedule", row.name),
          ],
          ["Record availability block", () => block(row)],
          ...(mode === "operator"
            ? ([
                [
                  "Edit aircraft",
                  () =>
                    edit(
                      kind,
                      row,
                      ["name", "model", "capacity", "base", "notes"],
                      "Edit aircraft details",
                    ),
                ],
                [
                  "Update availability",
                  () =>
                    edit(
                      kind,
                      row,
                      ["status", "notes"],
                      "Update aircraft availability",
                      row.status === "Pending Approval"
                        ? ["Pending Approval"]
                        : [
                            "Available",
                            "Reserved",
                            "Assigned",
                            "In Flight",
                            "Maintenance",
                            "Unavailable",
                          ],
                    ),
                ],
                ["Add mock document", () => upload()],
              ] as [string, () => void][])
            : [
                ["View operator", () => ui.inspect("operators", row.fields["operator"]!)] as [
                  string,
                  () => void,
                ],
              ]),
        ];
      case "crew":
        return [
          ["View documents", () => go(mode === "operator" ? "compliance" : "documents", "Crew")],
          ["View assignments", () => go("schedule", row.fields["flight"] ?? "")],
          [
            "Propose crew assignment",
            () =>
              edit(
                kind,
                row,
                ["flight", "notes"],
                "Propose crew assignment (eligibility requires operator review)",
              ),
          ],
          ...(mode === "operator"
            ? ([
                [
                  "Edit crew",
                  () =>
                    edit(
                      kind,
                      row,
                      [
                        "name",
                        "role",
                        "licence",
                        "licenceExpiry",
                        "medicalExpiry",
                        "qualifications",
                        "notes",
                      ],
                      "Edit crew record",
                    ),
                ],
                [
                  "Update availability",
                  () =>
                    edit(kind, row, ["status", "availability"], "Update crew availability", [
                      "Available",
                      "Review Required",
                      "Unavailable",
                      "Proposed",
                    ]),
                ],
              ] as [string, () => void][])
            : []),
          note,
        ];
      case "passengers":
        return [
          [
            "View documents",
            () => go(mode === "operator" ? "compliance" : "documents", "Passenger"),
          ],
          ...(mode === "operations"
            ? ([
                [
                  "Review ID evidence (mock)",
                  () => edit(kind, row, ["identity", "notes"], "Review fictional ID evidence"),
                ],
                ["Record weight / check-in", () => checkin(row)],
              ] as [string, () => void][])
            : []),
          [
            "Flag discrepancy",
            () => edit(kind, row, ["notes", "identity"], "Flag passenger for review"),
          ],
          note,
        ];
      case "sites":
        return [
          [
            "Record permission request",
            () => edit(kind, row, ["permission", "notes"], "Record permission request · demo"),
          ],
          ["Attach mock document", () => upload()],
          [
            "Flag requirements",
            () => edit(kind, row, ["notes", "permission"], "Flag missing site requirements"),
          ],
        ];
      case "tasks":
        return [
          [
            "Assign staff",
            () => edit(kind, row, ["staff", "priority", "notes"], "Assign ground staff"),
          ],
          [
            "Update status",
            () =>
              edit(
                kind,
                row,
                ["status", "notes"],
                "Update ground task",
                schemas["ground-handling"]!.statuses,
              ),
          ],
          note,
        ];
      case "compliance":
        return [
          ["Review evidence", () => ui.inspect("documents", row.fields["evidence"]!)],
          [
            "Flag / escalate issue",
            () =>
              edit(kind, row, ["status", "severity", "notes"], "Review compliance issue", [
                "Pending",
                "Evidence Submitted",
                "Exception Open",
                "Escalated",
              ]),
          ],
          note,
        ];
      case "incidents":
        return [
          [
            "Assign reviewer / update",
            () =>
              edit(
                kind,
                row,
                ["reviewer", "status", "escalation", "notes"],
                "Update incident coordination record",
                schemas["incidents"]!.statuses,
              ),
          ],
          note,
        ];
      case "hems":
        return [
          [
            "Update coordination",
            () =>
              edit(
                kind,
                row,
                ["equipment", "ambulance", "oxygen", "destinationFacility", "notes", "status"],
                "Update HEMS coordination",
                schemas["hems"]!.statuses,
              ),
          ],
          note,
        ];
      case "documents":
        return [
          ["Preview", () => ui.inspect(kind, row.id)],
          [
            "Download sample",
            () =>
              download(
                `${row.id}-sample.txt`,
                `${row.name}\nFICTIONAL SAMPLE ONLY — NOT FOR OPERATIONAL USE\n${row.fields["content"] ?? "No file content uploaded"}`,
                "text/plain",
              ),
          ],
          ...(mode === "operator"
            ? ([
                [
                  "Update metadata",
                  () =>
                    edit(
                      kind,
                      row,
                      ["expiry", "category", "notes"],
                      "Update document metadata (does not verify validity)",
                    ),
                ],
              ] as [string, () => void][])
            : []),
          note,
        ];
      case "notifications":
        return [
          [
            "Mark as read",
            () => {
              patch(kind, row, {}, "Marked read", "Read");
              toast.success("Marked as read");
            },
          ],
          ["Open related flight", () => ui.inspect("flights", row.fields["flight"]!)],
        ];
      case "requests":
        return [
          ["Check availability", () => go("availability")],
          [
            "Confirm availability",
            () =>
              edit(kind, row, ["status", "notes"], "Record availability response", [
                "Under Review",
                "Availability Confirmed",
                "Declined",
              ]),
          ],
          ["Prepare quotation", () => quote(undefined, row)],
          note,
        ];
      case "quotes":
        return [
          ["Duplicate as draft", () => quote(row, undefined, true)],
          ...(["Draft", "Revision Requested"].includes(row.status)
            ? ([
                ["Edit draft / revision", () => quote(row)],
                ["Submit to Viman (demo)", () => submitQuote(row)],
              ] as [string, () => void][])
            : []),
          note,
        ];
      default:
        return [note];
    }
  }
  return {
    go,
    spec,
    patch,
    edit,
    create,
    handover,
    assign,
    schedule,
    block,
    checkin,
    quote,
    submitQuote,
    incident,
    upload,
    actions,
  };
}
export function RecordActions({ kind, row }: { kind: Kind; row: Entry }) {
  const { actions } = useRecordActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="av-text-button" aria-label={`Actions for ${row.name}`}>
        <MoreHorizontal size={17} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="aviation">
        {actions(kind, row).map(([title, click]) => (
          <DropdownMenuItem key={title} onSelect={click}>
            {title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
