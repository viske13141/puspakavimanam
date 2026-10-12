type EventDetailRecord = Record<string, unknown>;

const sectionLabels: Record<string, string> = {
  event: "Event",
  aviation: "Aviation requirements",
  preferences: "Experience preferences",
  contact: "Event contact",
};

export function EventRequestDetails({ serviceDetails }: { serviceDetails: unknown }) {
  if (!isRecord(serviceDetails)) return null;

  const sections = Object.entries(sectionLabels)
    .map(([key, label]) => ({ label, details: serviceDetails[key] }))
    .filter((section): section is { label: string; details: EventDetailRecord } =>
      isRecord(section.details),
    );
  const groups =
    sections.length > 0 ? sections : [{ label: "Event request", details: serviceDetails }];

  return (
    <div className="grid gap-4">
      {groups.map(({ label, details }) => (
        <section key={label} className="border border-ivory/10 p-4">
          <h3 className="whisper mb-3 text-champagne">{label}</h3>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {Object.entries(details).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs capitalize text-ivory/40">{key.replace(/_/g, " ")}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-ivory/75">
                  {formatValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function isRecord(value: unknown): value is EventDetailRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ") || "None";
  if (isRecord(value)) {
    return (
      Object.entries(value)
        .map(([key, item]) => `${key.replace(/_/g, " ")}: ${formatValue(item)}`)
        .join(" · ") || "Not specified"
    );
  }
  return String(value);
}
