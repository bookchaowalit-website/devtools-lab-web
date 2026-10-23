# Lab Notebook

A browser-local experiment log: two authored sample entries, plus your own entries with a title, area, observation
and state (Draft, Active, Done). Search, filter by state, change state and remove. Entries are kept in this
browser's localStorage only.

Live: https://lab.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does not do

- No experiment pages or routes of their own, no live previews, no links to production builds.
- No account, sync, export or server storage. Clearing site data removes your entries.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: notebook logic, stored-state hook, MCP route, home page render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Code map

- `lib/lab.ts`: sample entries, `parseExperiments` (rejects corrupt or wrongly shaped storage), `filterExperiments`,
  `countByStatus`, `addExperiment`, `setStatus`, `removeExperiment`.
- `lib/use-stored-state.ts`: localStorage-backed state via `useSyncExternalStore` (server render uses the sample).
- `app/api/mcp/route.ts`: stateless JSON-RPC endpoint with `get_all`, `get_by_id` and `search` over the sample entries
  (a visitor's own entries never leave the browser).
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped; off when
  `NEXT_PUBLIC_SENTRY_DSN` is unset.
- `app/more-projects/page.tsx`: shared portfolio link page (copied per repository, not a package).
