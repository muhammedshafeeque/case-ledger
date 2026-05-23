# Case Ledger — Architecture

## Overview

Investigator-only platform — two TypeScript applications over HTTP:

- **server/** — Express API + BullMQ worker (port 3001)
- **client/** — React/Vite investigator UI (port 5173)

## Layers (server)

```
HTTP → routes → controller → service → repository → Prisma → PostgreSQL
                              ↓
                         Zod schemas (per table)
```

## Schema trio (per table)

| Layer | Location |
|-------|----------|
| DB | `server/prisma/models/<table>.prisma` |
| API | `server/src/modules/<domain>/schemas/<table>.schema.ts` |
| Types | `server/src/modules/<domain>/types/<table>.types.ts` |

## Modules

| Module | Responsibility |
|--------|----------------|
| auth | JWT, 2FA, users, refresh tokens |
| cases | Investigations, links, tags, case-entities |
| documents | Upload, knowledge entry, facts |
| entities | Entity graph, relationships |
| intelligence | Rules, alerts, contradictions |
| ai | Groq LLM orchestration (on-demand) |
| lookup | External lookups (user-confirmed) |
| legal | Penalties, evidence packages |
| analytics | Dashboard stats, CSV export |

## Scale path

- Stateless API behind Nginx
- `api` + `worker` containers scale independently
- Cursor pagination on all list endpoints
- PgBouncer when running multiple API replicas

## Reference data

SQLite reference DB via `prisma/reference` client — RTI Act, timelines, evasion patterns.
