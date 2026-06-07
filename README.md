# MoonWeight

MoonWeight is a private browser-based weight tracker with a React/Vite frontend, Hono API, PostgreSQL storage, and Docker Compose deployment.

## Features

- Add, edit, delete, and review weight entries.
- Track date, weight in kilograms, and an optional note.
- One-user password login with an HTTP-only session cookie.
- Dashboard stats for latest weight, previous delta, 7-day delta, 30-day delta, low/high weight, and total entries.
- Responsive weight evolution chart with 7D, 30D, 3M, and All filters.
- Mobile-friendly dark mystical UI for desktop browsers and mobile Safari.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react
- Backend: Node.js, Hono, TypeScript, Zod validation
- Database: PostgreSQL with Drizzle schema definitions
- Deployment: Docker Compose with Nginx serving the frontend and proxying `/api`

## Local Development

Copy the example environment file and set a strong password:

```sh
cp .env.example .env
```

Install dependencies:

```sh
npm install
```

Start PostgreSQL for local npm development:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres
```

Run migrations:

```sh
npm run db:migrate
```

Start the API and web app:

```sh
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://localhost:3001`.

## Docker Compose

For a production-like local run:

```sh
cp .env.example .env
docker compose up --build -d
```

Open `http://localhost:8080`, or the port set in `WEB_PORT`.

Useful commands:

```sh
docker compose logs -f
docker compose stop
docker compose pull
docker compose up --build -d
docker compose down
```

PostgreSQL is not published by `docker-compose.yml`; it is only reachable by services on the internal Docker network. The `docker-compose.dev.yml` override exposes it only on `127.0.0.1` for local development.

## VPS Deployment

The intended VPS target is `109.205.179.145`, but the IP is not hardcoded in the application. Use DNS, reverse proxy configuration, and environment variables instead.

On Ubuntu:

```sh
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
git clone <your-repo-url> moonweight
cd moonweight
cp .env.example .env
```

Edit `.env` and set:

- `POSTGRES_PASSWORD` to a strong unique password.
- `ADMIN_PASSWORD` to the password you will use to log in.
- `SESSION_SECRET` to a long random value, at least 32 characters.
- `WEB_PORT` to the internal port you want the reverse proxy to reach, for example `8080`.
- `CORS_ORIGIN` to the public HTTPS origin once a domain is configured.
- `VITE_API_BASE_URL` empty when the same host serves frontend and API through `/api`.

Start the app:

```sh
docker compose up --build -d
```

Use Caddy or Nginx on the VPS to terminate HTTPS and proxy to `http://127.0.0.1:8080`.

## Security Notes

This MVP includes a simple one-user password login. The password is read from `ADMIN_PASSWORD` in `.env`, and the session is stored in an HTTP-only cookie signed by `SESSION_SECRET`.

For production:

- Never commit `.env`.
- Use a strong app password and a long random `SESSION_SECRET`.
- Use a strong database password.
- Serve production traffic over HTTPS.
- Keep PostgreSQL on the Docker/internal network.
- Keep the VPS firewall closed except for SSH, HTTP, and HTTPS.
- Consider adding an extra protection layer such as VPN/Tailscale, Cloudflare Access, or reverse-proxy Basic Auth if the app is exposed to the public internet.

## API

```txt
GET    /api/weights
POST   /api/weights
GET    /api/weights/:id
PATCH  /api/weights/:id
DELETE /api/weights/:id
GET    /api/stats
GET    /api/auth/me
POST   /api/auth/login
POST   /api/auth/logout
GET    /health
```

Validation rules:

- `weightKg` must be a positive number below 1000.
- `date` must be a valid date string.
- `note` is optional and limited to 500 characters.

## Future Settings

The shared package already reserves settings types for target weight and units. CSV import/export and authentication can be added without changing the core entry API.
