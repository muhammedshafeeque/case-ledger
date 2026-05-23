# RTI Watch — Database Registry

## PostgreSQL (primary)

| Table | Prisma model | Module | Zod schema |
|-------|--------------|--------|------------|
| users | User | auth | user.schema.ts |
| refresh_tokens | RefreshToken | auth | refresh-token.schema.ts |
| rti_cases | RtiCase | cases | rti-case.schema.ts |
| entities | Entity | entities | entity.schema.ts |
| documents | Document | documents | document.schema.ts |
| facts | Fact | documents | fact.schema.ts |
| contradictions | Contradiction | intelligence | contradiction.schema.ts |
| alerts | Alert | intelligence | alert.schema.ts |
| audit_log | AuditLog | shared | audit-log.schema.ts |
| case_entities | CaseEntity | cases | case-entity.schema.ts |
| entity_relationships | EntityRelationship | entities | entity-relationship.schema.ts |
| case_links | CaseLink | cases | case-link.schema.ts |
| document_entities | DocumentEntity | documents | document-entity.schema.ts |
| case_tags | CaseTag | cases | case-tag.schema.ts |
| tags | Tag | cases | tag.schema.ts |
| lookup_logs | LookupLog | lookup | lookup-log.schema.ts |
| case_access | CaseAccess | cases | case-access.schema.ts |

## SQLite (reference)

| Table | Model | Module |
|-------|-------|--------|
| rti_act_sections | RtiActSection | reference |
| process_timelines | ProcessTimeline | reference |
| mandatory_documents | MandatoryDocument | reference |
| ui_translations | UiTranslation | reference |
| legal_precedents | LegalPrecedent | reference |
| evasion_patterns | EvasionPattern | reference |
