# MoonWeight operations

## Configuration

Copy the root .env.example and replace all three secret placeholders. Keep .env private. Hex-generated values avoid shell/Compose quoting surprises. If using values containing dollar signs, single-quote them in the .env file so Compose does not interpolate them.
Alternatively, `npm start` generates a new `.env` with random secrets when it does not exist, starts the Docker stack, and displays the one-time setup key. Existing configuration is never overwritten. `npm start -- --config .env.personal` selects an alternative private configuration file for the same Compose project.

`ADMIN_PASSWORD` is the operator setup key. Choose the actual username and password in the first-run browser form; PostgreSQL stores only the salted account password hash. Once the account exists, the setup key cannot authenticate. A legacy installation can still sign in with its old environment password until setup is completed, preserving existing data.

The API uses exact CORS origins. The default local deployment accepts localhost on ports 5173/8080. If you change WEB_PORT, update CORS_ORIGIN as well. Set COOKIE_SECURE=true and an HTTPS origin for a public deployment. Insecure production cookies are refused for non-loopback configured origins.

Local npm development derives its database URL from POSTGRES_HOST/PORT/USER/PASSWORD/DB, or uses DATABASE_URL when explicitly provided. Docker always uses its own service hostname and port. Secrets are passed at runtime, never baked into images.

## Start, stop, upgrade

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail 50 api
docker compose stop
docker compose up -d
```

Apply an upgrade only after making a backup. API startup applies unapplied migrations in one locked transaction. Existing migration files must remain unchanged; add a new file for schema changes. Migration failure leaves the previous schema intact and prevents the API from serving traffic.

The original timestamp migration is kept unchanged. v1 adds a DATE column, retaining the old timestamp in recorded_at_legacy. The new date is the old timestamp's UTC date. Original same-day readings remain distinct. The legacy column is deliberately outside the application schema and has no effect on new entries.

## Backup and restore

Prefer a PostgreSQL custom-format dump, which preserves dates, settings, sessions, and migration history. The database volume itself is another possible backup target when PostgreSQL is stopped.

To create a custom-format dump inside the running PostgreSQL container and copy it out (works in Windows PowerShell and POSIX shells):

```sh
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/moonweight-backup.dump'
docker compose cp postgres:/tmp/moonweight-backup.dump ./moonweight-backup.dump
```

Store the dump privately outside the repository. It contains your data and session hashes. CSV export is convenient for readings, but is not a complete database backup.

Restore into a separate, empty deployment first. Replace the container/database placeholders with that deployment's values:

```sh
docker compose cp ./moonweight-backup.dump postgres:/tmp/moonweight-backup.dump
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner /tmp/moonweight-backup.dump'
```

Avoid restoring over a running tracker. Stop the API/web while restoring and use an empty database. Revoke old sessions by changing SESSION_SECRET after a restore if needed.

## Demo isolation

Use a distinct Compose project and .env file, with a different WEB_PORT and matching CORS_ORIGIN:

```sh
docker compose --env-file .env.demo -p moonweight-demo up --build -d
docker compose --env-file .env.demo -p moonweight-demo exec api node dist/demo-seed.js
```

The seed refuses existing entries or customized settings. It has no force/reset option. A separate project receives its own database volume.

## Troubleshooting

- Missing environment variable: replace the named placeholder in .env. The admin password needs 12+ characters; the session secret needs 32+.
- Database unavailable: inspect PostgreSQL health and credentials. Changing POSTGRES_PASSWORD does not change a password inside an already initialized volume; change it in PostgreSQL or restore into a fresh deployment.
- Browser writes rejected: CORS_ORIGIN must exactly match the address in the browser, including its port.
- Login works but is lost immediately: use HTTPS with secure cookies, or COOKIE_SECURE=false for localhost HTTP.
- Local database port is unavailable: set an unused POSTGRES_PORT and recreate the development PostgreSQL container with the override.
- Migration constraints fail on an older database: inspect its data privately and correct invalid rows before retrying. Do not delete migration history or silently discard readings.
- Forgotten account password: use the owner-only recovery procedure below. Changing ADMIN_PASSWORD does not bypass an existing account.
- Application upgrade after long inactivity: review dependency/container updates and make a backup before rebuilding.

## Owner-only account recovery

There is no public password-reset endpoint. If you control the server and forget your username/password, take a private database backup first, then run:

```sh
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "BEGIN; DELETE FROM personal_account; DELETE FROM sessions; COMMIT;"'
```

This removes only the account and sessions, preserving all readings and preferences. Change the private `ADMIN_PASSWORD` setup key in `.env`, recreate the API (`docker compose up -d api`), and run `npm start`. Use its key to create your replacement account in the browser. Keep setup/recovery access restricted to the server owner.
