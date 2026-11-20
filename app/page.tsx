"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, PlusIcon, type Tone } from "@/components/app-shell";
import {
  EMPTY_DRAFT,
  SEED,
  STATUSES,
  STORAGE_KEY,
  addExperiment,
  filterExperiments,
  formatLogged,
  parseExperiments,
  restoreExperiment,
  setStatus,
  type Draft,
  type Experiment,
  type ExperimentStatus,
  type StatusFilter,
} from "@/lib/lab";
import { useStoredState } from "@/lib/use-stored-state";

type Filter = StatusFilter;
type Lifecycle = ExperimentStatus;
type RecordItem = Experiment;
const FILTERS: Filter[] = ["All", ...STATUSES];
const TONE: Record<Lifecycle, Tone> = { Draft: "amber", Active: "green", Done: "grey" };
const EMPTY: Draft = EMPTY_DRAFT;

// randomUUID only exists in secure contexts (HTTPS/localhost) and newer browsers.
function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `lab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// nextShown / prevShown: the rows shown around it when it was removed, for putting focus back nearby.
type RemovedEntry = { item: RecordItem; beforeId: string | null; nextShown?: string; prevShown?: string };
type RemovedBatch = { items: RemovedEntry[]; viaKeyboard: boolean };
const removedLabel = (items: RemovedEntry[]) => (items.length === 1 ? `Removed “${items[0].item.title}”` : `Removed ${items.length} experiments`);

// The row shows one line of detail (App shell rule); a long one gets Show more to read it in full.
function RecordDetail({ body }: { body: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { if (el.dataset.expanded !== "true") setClipped(el.scrollWidth > el.clientWidth); };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    let live = true;
    fonts?.ready?.then(() => { if (live) measure(); });
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [body]);
  const long = expanded || clipped || body.includes("\n");
  return (
    <>
      <p ref={ref} id={id} className="as-row-detail" data-expanded={expanded ? "true" : undefined}>{body}</p>
      {long ? (
        <button type="button" className="as-plain as-row-more" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}

export default function Home() {
  const [records, setRecords] = useStoredState(STORAGE_KEY, SEED, parseExperiments);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  // Every removal still inside the Undo window: one Undo puts them all back where they were.
  const [removed, setRemovedState] = useState<RemovedBatch | null>(null);
  const removedRef = useRef<RemovedBatch | null>(null);
  const setRemoved = (batch: RemovedBatch | null) => { removedRef.current = batch; setRemovedState(batch); };
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const wasComposing = useRef(false);
  const visible = useMemo(() => filterExperiments(records, filter, query), [records, filter, query]);
  const countOf = (value: Filter) => (value === "All" ? records.length : records.filter((r) => r.status === value).length);

  // Opening the composer focuses its name field; closing it returns focus to New experiment.
  useEffect(() => {
    if (composing) titleRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // When the toast closes, focus goes back near the removed row: the first of these rows still shown, else New experiment.
  const focusRowsNext = useRef<string[] | null>(null);
  useEffect(() => {
    const ids = focusRowsNext.current;
    if (removed || !ids) return;
    focusRowsNext.current = null;
    const rows = [...document.querySelectorAll<HTMLElement>(".as-row[data-record]")];
    const row = ids.map((id) => rows.find((entry) => entry.dataset.record === id)).find(Boolean);
    (row?.querySelector<HTMLButtonElement>(".as-danger") ?? newRef.current ?? titleRef.current)?.focus();
  }, [removed, records]);
  // While the toast shows, reserve its height at the bottom of the page and in scroll-padding.
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    const reserve = () => rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    reserve();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reserve) : null;
    observer?.observe(toast);
    return () => { observer?.disconnect(); rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);
  // The toast closes 6 s after the latest removal, but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => { removedRef.current = null; setRemovedState(null); }, 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setRecords((current) => addExperiment(current, draft, createId(), Date.now()));
    // Show the new record: its own list, and no search that might hide it.
    if (filter !== "All" && filter !== draft.status) setFilter(draft.status);
    setQuery("");
    setAnnouncement(`Added “${draft.title.trim()}”.`);
    setDraft(EMPTY);
    setComposing(false);
  }
  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }
  // The button removes itself once the filter widens, so keep focus in the search field (which stays put).
  function showAll() {
    setFilter("All");
    searchRef.current?.focus();
  }
  function remove(record: RecordItem, viaKeyboard: boolean) {
    let entry: RemovedEntry | undefined;
    setRecords((current) => {
      const index = current.findIndex((item) => item.id === record.id);
      if (index < 0) return current;
      entry = { item: current[index], beforeId: current[index + 1]?.id ?? null };
      return current.filter((item) => item.id !== record.id);
    });
    if (!entry) return;
    const shownAt = visible.findIndex((item) => item.id === record.id);
    entry.nextShown = visible[shownAt + 1]?.id;
    entry.prevShown = shownAt > 0 ? visible[shownAt - 1].id : undefined;
    const items = [...(removedRef.current?.items ?? []), entry];
    setRemoved({ items, viaKeyboard });
    setAnnouncement(`${removedLabel(items)}. Undo is available for a few seconds.`);
  }
  function closeToast(focusIds?: string[]) {
    const last = removedRef.current?.items.at(-1);
    focusRowsNext.current = focusIds ?? [last?.nextShown, last?.prevShown].filter((id): id is string => Boolean(id));
    setRemoved(null);
    setToastFocused(false);
  }
  function undo() {
    const items = removedRef.current?.items;
    if (!items?.length) return;
    // Latest removal first, so each record goes back before the row that followed it at the time.
    setRecords((current) => items.reduceRight((list, { item, beforeId }) => restoreExperiment(list, item, beforeId), current));
    setAnnouncement(items.length === 1 ? `Restored “${items[0].item.title}”.` : `Restored ${items.length} experiments.`);
    closeToast([items[items.length - 1].item.id]);
  }

  function changeStatus(record: RecordItem, status: Lifecycle) {
    setRecords((current) => setStatus(current, record.id, status));
    setAnnouncement(`“${record.title}” marked ${status}.`);
  }

  const title = filter === "All" ? "All experiments" : filter;
  const trimmed = query.trim();

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Lab notebook" tagline="Observe, log, leave a trace" />

      <div className="as-body">
        <aside className="as-side" aria-label="Lists">
          <h2>State</h2>
          <ul className="as-lists">
            {FILTERS.map((value) => (
              <ListButton key={value} label={value === "All" ? "All experiments" : value} count={countOf(value)} tone={value === "All" ? undefined : TONE[value]} current={filter === value} onSelect={() => setFilter(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? "experiment" : "experiments"}{trimmed ? ` matching “${trimmed}”` : ""}</p>
            </div>
            <div className="as-tools">
              <label className="as-search">
                <span className="as-sr">Search experiments</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
              </label>
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => setComposing(true)}><PlusIcon />New experiment</button>}
            </div>
          </div>

          {composing ? (
            <form className="as-composer" onSubmit={add} aria-label="New experiment">
              <label className="as-field">Experiment
                <input ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="The question to investigate" autoComplete="off" />
              </label>
              <label className="as-field">Area or tool
                <input value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })} placeholder="Runtime, type, process" autoComplete="off" />
              </label>
              <label className="as-field">Observation
                <textarea value={draft.observation} onChange={(event) => setDraft({ ...draft, observation: event.target.value })} placeholder="What did you notice? What should your future self try next?" />
              </label>
              <div className="as-composer-foot">
                <div className="as-segmented-wrap">
                  <span id="state-label">State</span>
                  <div className="as-segmented" role="group" aria-labelledby="state-label">
                    {STATUSES.map((status) => (
                      <button key={status} type="button" aria-pressed={draft.status === status} onClick={() => setDraft({ ...draft, status })}>{status}</button>
                    ))}
                  </div>
                </div>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={() => { setComposing(false); setDraft(EMPTY); }}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!draft.title.trim()}>Add</button>
                </div>
              </div>
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((record) => (
                <li className="as-row" key={record.id} data-record={record.id}>
                  <div>
                    <h3>{record.title}</h3>
                    <RecordDetail body={record.observation || "No observation logged yet."} />
                    <p className="as-row-meta">{record.area ? `${record.area} · ` : ""}Logged <time dateTime={new Date(record.createdAt).toISOString()}>{formatLogged(record.createdAt)}</time></p>
                  </div>
                  <label className="lab-state" data-tone={TONE[record.status]}>
                    <span className="as-sr">State for {record.title}</span>
                    <select value={record.status} onChange={(event) => changeStatus(record, event.target.value as Lifecycle)}>
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <button type="button" className="as-plain as-danger" aria-label={`Remove ${record.title}`} onClick={(event) => remove(record, event.detail === 0)}>Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {trimmed ? (
                <>
                  <strong>Nothing matches</strong>
                  No experiment in {filter === "All" ? "the notebook" : title} mentions “{trimmed}”.
                  <div className="lab-empty-actions">
                    <button type="button" className="as-plain" onClick={clearSearch}>Clear search</button>
                    {filter !== "All" ? <button type="button" className="as-plain" onClick={showAll}>Show all experiments</button> : null}
                  </div>
                </>
              ) : records.length === 0 ? (
                <><strong>No experiments yet</strong>Press New experiment to log the first question.</>
              ) : (
                <><strong>Nothing in {title}</strong>No experiment is {title.toLowerCase()} yet. Change a row&apos;s state, or press New experiment and pick {title}.</>
              )}
            </div>
          )}

          <p className="as-note">Saved in this browser only: no account or sync, and clearing site data removes it. The two starting entries are authored samples for this demo, not a running research programme.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") closeToast(); }}
        >
          <span>{removedLabel(removed.items)}</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo} aria-label={removed.items.length === 1 ? "Undo remove" : `Undo remove of ${removed.items.length} experiments`}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/devtools-lab-web" />
    </div>
  );
}
