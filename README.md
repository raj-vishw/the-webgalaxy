# The WebGalaxy

**Explore the internet as a living universe.**

The WebGalaxy is an immersive 3D map of the web. Every *universe* is a category of websites; every *celestial object* — star, planet, moon or comet — is a website. You fly between them, follow the connections that link related, alternative and complementary sites, search, let the galaxy choose your next stop, and visit the web from inside one continuous space.

![The WebGalaxy](public/social.png)

## Concept

- **Universes are peers.** AI, Cybersecurity, Development, Design, Gaming, Education, Science, Finance, Music, Entertainment — each is an independent region of the galaxy. Nothing contains or ranks another; the only container is The WebGalaxy itself.
- **Websites are celestial objects.** Prominence drives size and glow; object type drives the look. Positions are procedural and deterministic (seeded by the website's slug), so the galaxy never rearranges between visits.
- **Relationships are connections, not hierarchy.** `GitHub — Vercel` means the two are commonly used together. Connection lines appear only around the website you are looking at, drawn with distinct patterns (continuous, dashed, flowing, dot–dash) rather than colour alone.
- **Discovery over directory.** Search, filters, a discovery console (random, similar, alternatives, related, trending, emerging, universe), recommendations with reasons, your own exploration trail — all of it moves the camera through the same world.

## Features

- Cinematic entry: loading → landing over the live galaxy → a short flight in (longer on the first visit) → a three-card welcome for first-timers, skippable throughout
- Free exploration: drag, scroll/pinch, click/tap, hover labels, a top-down minimap, location indicator, keyboard shortcuts (`?` shows them)
- Website panel: description, tags, prominence, connections (with an accessible text twin), *Explore Similar / Find Alternatives / Works With*, *You may also explore*, Visit, Share (native share or copied link)
- Search as a command palette: ranked results, related/alternative expansions, universes, and actions (`>`)
- Filters (universe × type × prominence × trending/emerging/related/alternatives) that let non-matches recede
- Deep links: `/website/github`, `/universe/ai`; the address bar and browser history follow the journey
- Public **+ Add** submissions with duplicate detection and moderation before anything appears
- Adaptive graphics (Auto steps down on sustained low frame rates; High/Medium/Low overrides), reduced-motion support, accessible list view (`?view=list`) and a WebGL-less fallback
- Backend API, PostgreSQL database and an administration area at `/admin` (one administrator, configured through the environment) for reviewing submissions and managing universes, websites, relationships, tags and trending flags
- Offline resilience: the last loaded catalogue (or the bundled one) keeps the galaxy rendering when the API is unreachable

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS 4 · Zustand · GSAP |
| 3D | Three.js · @react-three/fiber · @react-three/drei · @react-three/postprocessing |
| Backend | Node 22 · Fastify 5 · Zod · Drizzle ORM · pino |
| Database | PostgreSQL (PGlite — embedded PostgreSQL — in development and tests) |
| Admin | The same React build, served at `/admin` |
| Tests | Vitest (web) · node:test (API, in-memory PostgreSQL) · Playwright (end-to-end) |

## Architecture

```
                         PostgreSQL
                              ↑
                    Fastify API  (backend/)
            routes → controllers → services → repositories → db
                              ↑
              ┌───────────────┴───────────────┐
       WebGalaxy UI (src/)              Admin (src/admin, served at /admin)
       services/*Api → catalogStore     admin/services/api → pages
       React / Zustand → R3F / Three.js
```

- The 3D engine never talks to the database; it renders whatever the catalogue store holds. The store renders instantly from the last cached load or the bundled dataset, then loads progressively from the API (universes → lightweight website records → relationships) and fetches full records on selection.
- The entered universe draws full celestial objects for its most prominent websites (budgeted per graphics tier); every other website in the galaxy is one sprite in a per-universe point cloud that still orbits, glows and answers search — one draw call per universe, so the scene scales to thousands of websites.
- Public routes are read-only plus moderated submissions; everything under `/api/admin/*` requires a JWT and a role. Validation happens in Zod *and* the database (unique slugs and normalised URLs, foreign keys, check constraints, no self-relationships, one relationship per unordered pair and type).
- Detailed build notes per phase live in [docs/PHASES.md](docs/PHASES.md); the API reference in [backend/API.md](backend/API.md); operations in [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Installation

Requirements: Node 22+, npm 10+. PostgreSQL is optional in development.

```sh
git clone <this repository>
cd the-webgalaxy
npm install
```

## Environment variables

Copy the examples and adjust; `.env` files are git-ignored.

| File | Purpose |
| --- | --- |
| `backend/.env.example` → `backend/.env` | API: `DATABASE_URL` (unset = embedded PostgreSQL in `backend/data/`), `PORT`, `CORS_ORIGINS`, `JWT_SECRET`, `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` (the one administrator), rate limits, `LOG_LEVEL`, `TRUST_PROXY` |
| `.env.example` → `.env` | Public app: `VITE_API_URL` (defaults to `/api`, proxied to the API in development) |

Only `VITE_*` variables reach the browser — never put secrets in the frontend files. In production the API refuses to start with the default `JWT_SECRET` or `ADMIN_PASSWORD`, or without `DATABASE_URL`.

## Database setup

```sh
npm run db:migrate   # apply migrations (backend/drizzle) to the configured database
npm run db:seed      # migrate + seed universes, websites, tags, relationships, trend snapshot, first admin
npm run db:seed -- --reset   # empty every table first
```

Schema changes: edit `backend/src/db/schema.ts`, then `npm run db:generate --workspace backend` to produce the next SQL migration. Migrations are applied automatically when the API starts.

To use a real PostgreSQL locally: `JWT_SECRET=… ADMIN_PASSWORD=… docker compose up db`, then set `DATABASE_URL=postgresql://webgalaxy:webgalaxy@localhost:5432/webgalaxy` in `backend/.env`.

## Running locally

```sh
npm run dev          # galaxy (http://localhost:5173, admin at /admin) + API (http://localhost:4000)
npm run dev:web | dev:api   # individually
```

Development extras: `P` toggles a performance readout (fps, frame time, draw calls, primitives, resources, heap); `window.__webgalaxy` exposes the stores for tests.

## Admin setup

There is exactly **one administrator**, and it is the only account in the system. Its email, name and password come from `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` in `backend/.env` (defaults `admin@webgalaxy.local` / `change-me-now` — change them before seeding anything real). The API makes the database match those values every time it starts and when you run `npm run db:seed`: the account is created or updated, and any other account is removed. To change the password, change the variable and restart the API.

Sign in at **`/admin`** on the public site (e.g. `http://localhost:5173/admin`). Sections: overview, submissions, websites, universes, relationships, tags. There are no other logins anywhere — visitors never sign in. Administrative actions are written to `admin_audit_log` and the server log.

## Tests

```sh
npm test               # web unit tests (Vitest) + API tests (node:test on in-memory PostgreSQL)
npm run test:web
npm run test:api
npm run test:e2e       # browser journey + platform checks; needs `npm run dev` running
npm run test:e2e:mobile
```

The end-to-end suites read `WEB_URL` (default `http://localhost:5173`), `API_URL`, `CHROMIUM_PATH` (a system Chromium; Playwright's bundled browsers work too) and `E2E_GPU=1` to enable hardware WebGL flags.

## Production

```sh
npm run build:all    # dist/ (web + /admin), backend/dist/ (API)
```

- **Web** (including `/admin`) is a static build: host `dist/` on any static host or CDN with a history fallback to `index.html` (deep links and `/admin` are client-side routes). Set `VITE_API_URL` at build time when the API lives on another origin. Consider restricting `/admin` further at the proxy (IP allow-list or VPN).
- **API**: `node backend/dist/server.js` with the environment above, or the image built from `backend/Dockerfile` (`docker compose up` runs PostgreSQL + API). Health: `GET /health` (liveness), `GET /health/ready` (database). Put it behind TLS; set `TRUST_PROXY=true` behind a reverse proxy so rate limits see real client addresses; list the web origin in `CORS_ORIGINS`.
- Deployment, backups, monitoring and the security checklist: [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Deploying to Vercel

[vercel.json](vercel.json) deploys the Vite build as the site and the Fastify API as
one Node.js Function ([api/index.ts](api/index.ts)). Every `/api/*` request (and
`/health`, `/health/ready`) is rewritten to that function; every other path falls
back to `index.html`, so `/admin`, `/website/github` and `/universe/ai` work as
deep links. The frontend calls the same-origin `/api`, so `VITE_API_URL` stays unset.

1. Create a PostgreSQL database (Neon, Supabase, Vercel Postgres, …).
2. In the Vercel project settings add these **Production** environment variables:

   ```text
   DATABASE_URL=postgresql://...
   JWT_SECRET=<a unique random value, at least 16 characters>
   ADMIN_EMAIL=admin@your-domain.com
   ADMIN_PASSWORD=<a strong unique password, at least 8 characters>
   ADMIN_NAME=Galaxy Admin
   ```

   The API refuses to start in production without `DATABASE_URL`, `JWT_SECRET` and a
   non-default `ADMIN_PASSWORD`. `TRUST_PROXY` is on automatically on Vercel, and the
   deployment's own `*.vercel.app` URLs and custom domain are allowed origins; set
   `CORS_ORIGINS` only if another site must call the API. Give Preview deployments
   their own database if they should have data at all.
3. Deploy (`git push` with the Vercel Git integration, or `vercel deploy`). The
   function runs migrations and creates the administrator on its first request.
4. Seed the catalogue once from your machine — the database starts empty:

   ```bash
   DATABASE_URL=postgresql://... npm run db:seed
   ```

   Until then the site still renders from the bundled catalogue and shows the
   "connection interrupted" notice only if the API is unreachable.

Pick a function region close to the database (Project Settings → Functions) to keep
API latency low. `npx vercel build` reproduces the whole build locally.

## Contributing

Issues and pull requests are welcome once the repository is public. Keep the conceptual rules: no hierarchy between universes, relationships are connections between equals, the 3D scene stays the primary interface, and nothing personal is collected. Run `npm run lint`, `npm test` and the relevant e2e suite before opening a pull request.

## License

No license has been chosen yet — all rights reserved by the author until a `LICENSE` file is added. If you intend to open-source the project, add a `LICENSE` (MIT is the usual choice for this kind of app) and update this section.
