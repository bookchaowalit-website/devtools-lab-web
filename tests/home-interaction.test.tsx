// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { STORAGE_KEY } from "@/lib/lab";
import { resetStoredCache } from "@/lib/use-stored-state";

// Mounted tests for the lab notebook on the App shell: composer, lists, state, search, remove, undo and focus.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const rows = () => [...host.querySelectorAll(".as-row h3")].map((h) => h.textContent);
const press = (el: Element, detail = 0) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const entry = (id: string, title: string, status: string, observation = "Saw something") => ({ id, title, area: "Area", observation, status, createdAt: 1710000000000 });

function mount(stored?: unknown) {
  localStorage.clear();
  if (stored !== undefined) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  resetStoredCache();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
}
function remount(stored?: unknown) {
  act(() => root.unmount());
  host.remove();
  mount(stored);
}

beforeEach(() => mount([entry("a", "Edge runtime", "Active"), entry("b", "Type study", "Draft", "Line one\nLine two"), entry("c", "Old probe", "Done", "")]));
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("composer", () => {
  it("opens focused, keeps Add disabled without a title, adds on top, saves and returns focus", () => {
    press(button("New experiment"));
    expect(document.activeElement).toBe($(".as-composer input"));
    expect(button("Add", $(".as-composer")!).disabled).toBe(true);
    const [title, area] = [...host.querySelectorAll<HTMLInputElement>(".as-composer input")];
    type(title, "Cache warmup");
    type(area, "Runtime");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "Faster second hit");
    press(button("Active", $(".as-composer")!));
    press(button("Add", $(".as-composer")!));
    expect(rows()[0]).toBe("Cache warmup");
    expect(document.activeElement?.textContent).toContain("New experiment");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0]).toMatchObject({ title: "Cache warmup", area: "Runtime", status: "Active" });
  });

  it("switches to the new entry's list when added from another list, and Cancel clears the draft", () => {
    press(button("Done", $(".as-side")!));
    press(button("New experiment"));
    type($<HTMLInputElement>(".as-composer input")!, "Fresh draft");
    press(button("Add", $(".as-composer")!));
    expect($("h1")!.textContent).toBe("Draft");
    expect(rows()).toContain("Fresh draft");
    press(button("New experiment"));
    type($<HTMLInputElement>(".as-composer input")!, "never");
    press(button("Cancel", $(".as-composer")!));
    expect($(".as-composer")).toBeNull();
  });
});

describe("rows, lists and search", () => {
  it("changes a row's state with its select, and the list counts follow", () => {
    expect(host.textContent).toContain("No observation logged yet.");
    const select = host.querySelector<HTMLSelectElement>(".lab-state select")!;
    act(() => {
      select.value = "Done";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0].status).toBe("Done");
    expect(button("Done", $(".as-side")!).textContent).toContain("2");
    expect(host.textContent).toContain("“Edge runtime” marked Done.");
  });

  it("shows list-specific and empty-notebook states", () => {
    remount([entry("a", "x", "Active")]);
    press(button("Done", $(".as-side")!));
    expect(host.textContent).toContain("Nothing in Done");
    remount([]);
    expect(host.textContent).toContain("No experiments yet");
  });

  it("searches, and a no-match state offers Clear search (focus back in the field) and Show all", () => {
    press(button("Draft", $(".as-side")!));
    type($<HTMLInputElement>(".as-search input")!, "zzz");
    expect(host.textContent).toContain("Nothing matches");
    press(button("Show all experiments"));
    expect($("h1")!.textContent).toBe("All experiments");
    press(button("Clear search"));
    expect(document.activeElement).toBe($(".as-search input"));
    expect(rows()).toHaveLength(3);
  });

  it("offers Show more for a multi-line observation", () => {
    const more = button("Show more");
    press(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("remove and undo", () => {
  it("removes with a toast; Undo by keyboard restores the row in place and focuses its Remove", () => {
    press(host.querySelector('[aria-label="Remove Type study"]')!, 0);
    expect(rows()).toEqual(["Edge runtime", "Old probe"]);
    expect(document.activeElement).toBe(button("Undo"));
    press(button("Undo"));
    expect(rows()).toEqual(["Edge runtime", "Type study", "Old probe"]);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Remove Type study");
  });

  it("batches two removals into one Undo, closes after 6 s, and Escape dismisses", () => {
    vi.useFakeTimers();
    press(host.querySelector('[aria-label="Remove Edge runtime"]')!, 1);
    press(host.querySelector('[aria-label="Remove Type study"]')!, 1);
    expect($(".as-toast")!.textContent).toContain("Removed 2 experiments");
    press(button("Undo"));
    expect(rows()).toEqual(["Edge runtime", "Type study", "Old probe"]);
    press(host.querySelector('[aria-label="Remove Old probe"]')!, 1);
    act(() => { vi.advanceTimersByTime(6000); });
    expect($(".as-toast")).toBeNull();
    press(host.querySelector('[aria-label="Remove Edge runtime"]')!, 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Remove Type study");
  });
});
