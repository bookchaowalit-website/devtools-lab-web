// Lab notebook data and pure logic, shared by the page and the MCP route.

export type ExperimentStatus = "Draft" | "Active" | "Done";
export type Experiment = { id: string; title: string; area: string; observation: string; status: ExperimentStatus; createdAt: number };
export type Draft = Pick<Experiment, "title" | "area" | "observation" | "status">;
export type StatusFilter = ExperimentStatus | "All";

export const STORAGE_KEY = "lab-v2";
export const STATUSES: ExperimentStatus[] = ["Draft", "Active", "Done"];
export const EMPTY_DRAFT: Draft = { title: "", area: "", observation: "", status: "Draft" };

// Authored sample entries for the portfolio demo (not a running research program).
export const SEED: Experiment[] = [
  { id: "edge-runtime", title: "Edge runtime notes", area: "Next.js", observation: "Compare cold-start behavior before choosing a route boundary.", status: "Active", createdAt: 1710000000000 },
  { id: "mono-type", title: "Monochrome type study", area: "Typography", observation: "A narrow display face gives the archive more instrument-panel tension.", status: "Done", createdAt: 1709200000000 },
];

export function isStatus(value: unknown): value is ExperimentStatus {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

function isExperiment(value: unknown): value is Experiment {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.area === "string" &&
    typeof item.observation === "string" &&
    isStatus(item.status) &&
    typeof item.createdAt === "number" &&
    Number.isFinite(item.createdAt)
  );
}

/** Parse the stored notebook. Returns null (use the sample) for missing, corrupt or wrongly shaped data. */
export function parseExperiments(raw: string | null): Experiment[] | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(value)) return null;
  return value.filter(isExperiment);
}

export function filterExperiments(items: Experiment[], filter: StatusFilter, query: string): Experiment[] {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (filter === "All" || item.status === filter) &&
      (!needle || `${item.title} ${item.area} ${item.observation} ${item.status}`.toLowerCase().includes(needle)),
  );
}

export function countByStatus(items: Experiment[]) {
  return {
    total: items.length,
    active: items.filter((item) => item.status === "Active").length,
    done: items.filter((item) => item.status === "Done").length,
  };
}

/** New entries go on top. A blank title adds nothing (returns the same list). */
export function addExperiment(items: Experiment[], draft: Draft, id: string, now: number): Experiment[] {
  const title = draft.title.trim();
  if (!title) return items;
  return [{ id, title, area: draft.area.trim(), observation: draft.observation.trim(), status: draft.status, createdAt: now }, ...items];
}

export function setStatus(items: Experiment[], id: string, status: ExperimentStatus): Experiment[] {
  return items.map((item) => (item.id === id ? { ...item, status } : item));
}

export function removeExperiment(items: Experiment[], id: string): Experiment[] {
  return items.filter((item) => item.id !== id);
}

/**
 * Put a removed entry back before the entry that followed it when it was removed (`beforeId`), or at the end
 * when that entry is gone too. An entry that is already present is not added twice.
 */
export function restoreExperiment(items: Experiment[], item: Experiment, beforeId: string | null): Experiment[] {
  if (items.some((entry) => entry.id === item.id)) return items;
  const index = beforeId === null ? -1 : items.findIndex((entry) => entry.id === beforeId);
  if (index < 0) return [...items, item];
  return [...items.slice(0, index), item, ...items.slice(index)];
}

/** "10 Mar 2024" in UTC, so the server and every browser print the same date. */
export function formatLogged(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
