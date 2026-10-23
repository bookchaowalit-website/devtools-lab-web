import { describe, expect, it } from "vitest";
import { SEED, addExperiment, countByStatus, filterExperiments, parseExperiments, removeExperiment, setStatus } from "@/lib/lab";

describe("parseExperiments", () => {
  it("returns null for missing, corrupt or non-array data so the sample is used", () => {
    expect(parseExperiments(null)).toBeNull();
    expect(parseExperiments("")).toBeNull();
    expect(parseExperiments("{oops")).toBeNull();
    // Regression: a stored object or string used to reach experiments.filter() and crash the page.
    expect(parseExperiments('{"a":1}')).toBeNull();
    expect(parseExperiments('"text"')).toBeNull();
  });

  it("keeps valid entries and drops malformed ones", () => {
    const raw = JSON.stringify([SEED[0], { id: "x", title: 3 }, { ...SEED[1], status: "Lost" }]);
    expect(parseExperiments(raw)).toEqual([SEED[0]]);
  });

  it("keeps an empty notebook empty", () => {
    expect(parseExperiments("[]")).toEqual([]);
  });
});

describe("filterExperiments", () => {
  it("matches title, area, observation and state, case-insensitive", () => {
    expect(filterExperiments(SEED, "All", "  NEXT.JS ").map((i) => i.id)).toEqual(["edge-runtime"]);
    expect(filterExperiments(SEED, "All", "done").map((i) => i.id)).toEqual(["mono-type"]);
  });

  it("combines the state filter with the query", () => {
    expect(filterExperiments(SEED, "Done", "runtime")).toEqual([]);
    expect(filterExperiments(SEED, "Draft", "")).toEqual([]);
    expect(filterExperiments(SEED, "All", "")).toHaveLength(2);
  });
});

describe("notebook edits", () => {
  it("adds a trimmed entry on top and ignores a blank title", () => {
    const next = addExperiment(SEED, { title: "  Shader test ", area: " WebGL ", observation: " ok ", status: "Active" }, "n1", 5);
    expect(next[0]).toEqual({ id: "n1", title: "Shader test", area: "WebGL", observation: "ok", status: "Active", createdAt: 5 });
    expect(next).toHaveLength(3);
    expect(addExperiment(SEED, { title: "   ", area: "", observation: "", status: "Draft" }, "n2", 6)).toBe(SEED);
  });

  it("changes one state and removes one entry without touching the rest", () => {
    const moved = setStatus(SEED, "edge-runtime", "Done");
    expect(countByStatus(moved)).toEqual({ total: 2, active: 0, done: 2 });
    expect(SEED[0].status).toBe("Active");
    expect(removeExperiment(SEED, "mono-type").map((i) => i.id)).toEqual(["edge-runtime"]);
  });
});
