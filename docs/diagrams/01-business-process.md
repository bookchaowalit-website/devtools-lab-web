# 01 — Business process (As-Is / To-Be)

devtools-lab-web คือสมุดบันทึกการทดลองฝั่งเบราว์เซอร์ เริ่มด้วยรายการตัวอย่าง 2 รายการ ผู้ใช้เพิ่ม ค้นหา กรองตามสถานะ (Draft, Active, Done) เปลี่ยนสถานะ และลบรายการได้ โดยเก็บใน localStorage ของเบราว์เซอร์เดียว ส่วน `/api/mcp` เปิดเฉพาะรายการตัวอย่าง

Last reviewed: 2026-11-28 · commit `6b9e940`

## As-Is (จากโค้ดวันนี้)

```mermaid
flowchart LR
  V["Visitor browser"] --> PAGE["GET / notebook page"]
  SEED["lib/lab.ts SEED (2 sample entries)"] --> PAGE
  PAGE --> READ["useStoredState reads localStorage lab-v2 once, caches"]
  READ -->|"missing, corrupt JSON, not an array, storage blocked"| SEEDUSE["use SEED"]
  READ -->|"array: invalid rows dropped (all invalid = empty notebook)"| LIST["entries, per-state counters All / Draft / Active / Done, count for current filter and search"]
  SEEDUSE --> LIST
  LIST --> FIND["filterExperiments: All/Draft/Active/Done + search"]
  LIST --> ADD["addExperiment (new on top)"]
  ADD -->|"blank title"| NOADD["list unchanged"]
  LIST --> CHG["setStatus"]
  LIST --> DEL["remove (toast with Undo for ~6 s)"]
  DEL -->|"Undo"| UNDO["restore removed rows"]
  ADD --> WRITE["writeStored: cache + localStorage"]
  CHG --> WRITE
  DEL --> WRITE
  UNDO --> WRITE
  WRITE -->|"storage full or blocked"| MEM["kept in memory for this visit"]
  AGENT["MCP client"] --> RPC["POST /api/mcp JSON-RPC"]
  RPC -->|"get_all, get_by_id, search"| SEED
  RPC -->|"unknown tool, id or method, bad JSON"| ERR["HTTP 400 JSON-RPC error"]
  V -->|"/more-projects"| REDIR["308 redirect to bookchaowalit.com"]
  PAGE -.->|"errors only, if DSN set"| SENTRY["Sentry (request, user, breadcrumbs, extra, URL queries removed; error text otherwise sent)"]
  PUSH["push or PR to main"] --> CI["GitHub CI: lint, typecheck, tests 90% gate, build, security scan (no deploy job)"]
  PUSH -.->|"separate path"| VDEP["Vercel deploy: CLI, Git link points to old repo [ต้องยืนยัน]"]
```

Sources: `lib/lab.ts`, `lib/use-stored-state.ts`, `app/page.tsx`, `app/api/mcp/route.ts`, `next.config.ts`, `lib/sentry.ts`, `.github/workflows/ci.yml`, `README.md`, `PRODUCT.md`

ข้อเท็จจริงสำคัญจากโค้ด:

- รายการที่ผู้ใช้เพิ่มอยู่ในเบราว์เซอร์เท่านั้น MCP มองไม่เห็น; ไม่มี export หรือ sync
- ไม่มี workflow deploy ใน repo; ตาม PRODUCT.md (2026-10-23) deploy ด้วย Vercel CLI และ Git link ชี้ repo เก่า [ต้องยืนยัน] สถานะวันนี้
- PRODUCT.md ระบุ Vercel Analytics แต่ไม่พบการใช้งานใน `app/`, `components/`, `package.json` ของ commit นี้ [ต้องยืนยัน]
- `NEXT_PUBLIC_SENTRY_DSN` บน production: [ต้องยืนยัน]; เมื่อเปิด Sentry `beforeSend` (`lib/sentry.ts`) ลบ request, user, breadcrumbs, extra, contexts นอก platform, ตัด query/hash และลบ frame vars แต่ไม่ได้กรองข้อมูลอื่นในข้อความ error; error report เป็นข้อยกเว้นของ "ข้อมูลอยู่ในเบราว์เซอร์"

## To-Be (จาก PRODUCT.md §Live URL and deploy state)

```mermaid
flowchart LR
  PUSH["push to main"] --> CI["GitHub CI (checks only)"]
  PUSH --> GIT["Vercel Git link to devtools-lab-web (not gated by CI unless Deployment Checks set [ต้องยืนยัน])"]
  GIT --> LIVE["lab.bookchaowalit.com runs latest main"]
```

Sources: `PRODUCT.md` (owner action D9)

## Gap

| ID | As-Is → To-Be | Status | Owner | Evidence |
|---|---|---|---|---|
| G1 | deploy ด้วย CLI และ Git link ชี้ repo เก่า (site ตามหลัง main) → เชื่อม Vercel Git กับ `devtools-lab-web` | decide | owner | `PRODUCT.md` owner action D9 [ต้องยืนยัน] สถานะปัจจุบัน |

## Open questions

- Vercel Git link ของโปรเจกต์ `bookchaowalit-lab-frontend` ยังชี้ repo เก่าอยู่หรือไม่
- `NEXT_PUBLIC_SENTRY_DSN` ตั้งบน production หรือไม่
