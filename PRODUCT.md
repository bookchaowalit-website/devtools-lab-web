# Lab Notebook — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `lab`) on 2026-10-23.

## What it is

A client-side notebook for logging small experiments, seeded with two authored sample entries.

## Who it is for

A portfolio visitor who wants to see a small CRUD list UI with search and state filters.

## What works today

1. Add an entry (title required; area, observation and state optional). New entries go on top.
2. Search title, area, observation or state (case-insensitive) and filter by All, Draft, Active or Done.
3. Change an entry's state or remove it; counters show total, active and done.
4. Entries persist in this browser's localStorage. Corrupt or wrongly shaped stored data falls back to the sample
   instead of crashing the page.
5. `/api/mcp` answers JSON-RPC with `get_all`, `get_by_id` and `search` over the sample entries only.
6. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No isolated experiment pages, routes, live previews or links to production (claims removed from the portfolio card
  in the 2026-10 review). The sample entries are authored copy, not a running research program.
- No account, sync, export or server storage. No product analytics beyond Vercel Analytics.

## Live URL and deploy state

- Live: https://lab.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-lab-frontend` is deployed only by CLI (last production 2026-10-23 12:04, CLI
  deploy of commit c8ebca1, the Next 16.4.2 security patch) and its Git link names the old repository
  `bookchaowalit/bookchaowalit-lab-frontend`, so a push to `main` does not deploy. The live site lags `main` (no
  Sentry, template MCP route, no storage validation) until the owner reconnects Vercel Git to this repository (owner
  action D9). `NEXT_PUBLIC_SENTRY_DSN` is already set on the Vercel project (Sentry project `devtools-lab-web`, org
  `personal-yu0`).

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route.
