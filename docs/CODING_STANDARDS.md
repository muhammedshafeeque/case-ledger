# RTI Watch — Coding Standards

## Naming

| Artifact | Pattern | Example |
|----------|---------|---------|
| Prisma model | PascalCase singular | `RtiCase` |
| DB table | snake_case `@@map` | `rti_cases` |
| Zod schema | camelCase + suffix | `createRtiCaseSchema` |
| Repository file | `<table>.repository.ts` | `rti-case.repository.ts` |
| Routes | `/api/v1/<plural>` | `/api/v1/cases` |

## Module layout

Every domain module MUST contain:

- `<domain>.routes.ts`
- `<domain>.controller.ts`
- `<domain>.service.ts`
- `repositories/`
- `schemas/`
- `types/`
- `index.ts` (exports router only)

## Rules

- Strict TypeScript — no `any`, no `.js` source files
- No `prisma` imports in routes or controllers
- No `prisma.$executeRawUnsafe`
- All list endpoints use cursor pagination
- API responses use envelope: `{ success, data, meta?, error? }`
- Raw SQL only in `graph.repository.ts` via `Prisma.sql`

## PR checklist

- [ ] Zod schema for new/changed endpoints
- [ ] Repository for new table access
- [ ] Tests for business logic
- [ ] `tsc --noEmit` passes
- [ ] No secrets in code
