# v1.0 implementation notes

Preserve the React/Vite + Hono + Drizzle/PostgreSQL monorepo and its HTTP-only cookie flow.

1. Establish baseline: clean install, typecheck/build, inspect all source/configuration, privacy scan.
2. Shared contracts: strict calendar dates, safe decimal weights, deterministic stats/ranges, canonical kg and CSV validation.
3. Persistence/security: additive migrations, database-backed revocable sessions, bounded login attempts, explicit origins/cookie settings, settings and non-destructive CSV import.
4. Product: restrained lunar visual system, dashboard hierarchy, time-scaled chart, accessible edit/delete/settings/import dialogs, history navigation and complete async states.
5. Verification: shared/API/frontend tests, real PostgreSQL integration, browser CRUD/mobile smoke, clean production Compose and restart/persistence checks.
6. Release: fictional seed with empty-database guard, screenshots, README/portfolio material, final verification record and v1.0.0 version.

Baseline findings: fresh typecheck fails before shared output exists; no tests; date parsing accepts invalid calendar dates; mutations lack ID validation; stats assume sorted input and overstate sparse comparisons; logout does not revoke signed sessions; wildcard CORS is permitted with credentials; local .env is not loaded from workspace scripts; production defaults accept example secrets; settings are types only; browser confirmation and unhandled logout errors; no success/initial data loading states. A personal deployment address was removed from the README working tree. Existing Git history is preserved and must be reviewed before publication.
