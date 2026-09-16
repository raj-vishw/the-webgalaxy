# The WebGalaxy API

Base URL: `http://localhost:4000/api` in development (the web dev server proxies `/api` there).

## Envelope

Every response is JSON with the same shape.

```jsonc
// success
{ "success": true, "data": … }
// success, paginated
{ "success": true, "data": [ … ], "pagination": { "page": 1, "limit": 50, "total": 240, "totalPages": 5 } }
// failure
{ "success": false, "error": { "code": "WEBSITE_NOT_FOUND", "message": "The requested website could not be found.", "details": [ … ] } }
```

`details` appears on `VALIDATION_ERROR` as `[{ "path": "limit", "message": "…" }]`. Stack traces and database errors are never returned.

| Status | Codes |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_URL`, `INVALID_UNIVERSE`, `SELF_RELATIONSHIP`, `INVALID_ANCHOR`, `UNIVERSE_REQUIRED` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN`, `ORIGIN_NOT_ALLOWED` |
| 404 | `NOT_FOUND`, `UNIVERSE_NOT_FOUND`, `WEBSITE_NOT_FOUND`, `RELATIONSHIP_NOT_FOUND`, `SUBMISSION_NOT_FOUND`, `TAG_NOT_FOUND`, `NOTHING_TO_DISCOVER` |
| 409 | `WEBSITE_EXISTS`, `SUBMISSION_PENDING`, `WEBSITE_URL_EXISTS`, `WEBSITE_SLUG_TAKEN`, `UNIVERSE_SLUG_TAKEN`, `DUPLICATE_RELATIONSHIP`, `SUBMISSION_ALREADY_REVIEWED` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |

Identifiers: every entity has a UUID `id` and a `slug`. Route parameters written `:id` accept either. The galaxy uses slugs as its stable domain ids (procedural positions derive from them).

## Public endpoints (no authentication)

### Health
- `GET /health` → `{ "status": "ok" }` (liveness, outside `/api`)
- `GET /health/ready` → `{ "status": "ok", "database": "ok" }` or 503 when the database does not answer

### Universes
- `GET /api/universes` — active universes, ordered by `sortOrder` (intro reveal only — never rank). Cached 60 s.
- `GET /api/universes/:id`

```jsonc
{ "id": "…", "slug": "ai", "name": "AI", "description": "…", "visualType": "spiral",
  "visualConfig": { "position": [-36, 2, -12], "scale": 12, "palette": { "core": "#…", "primary": "#…", "secondary": "#…" }, "seed": 11,
                    "layout": { "spread": [0.8, 0.42, 0.7], "coreBias": 0.6, "energy": 1.2, "dust": 1.5 } },
  "sortOrder": 0, "isActive": true, "websiteCount": 10, "createdAt": "…", "updatedAt": "…" }
```

Universes are peers: there is no parent, child or nesting field anywhere, and unknown fields in write payloads are dropped.

### Websites
- `GET /api/websites` — paginated. Query: `page` (≥1), `limit` (1–200, default 50), `universe` (slug or id), `type` (`star|planet|moon|comet`), `trending` (`true|false`), `emerging`, `tag` (slug), `q` (substring across name/description/universe/tags), `fields` (`light` default, `full`). Filters combine with AND.
- `GET /api/websites/:id` — full record.
- `GET /api/websites/:id/relationships` — every connection of the website.
- `GET /api/websites/:id/related` — same as above (discovery alias).
- `GET /api/websites/:id/alternatives` — `alternative` relationships only.
- `GET /api/websites/:id/integrations` — `integration` and `complementary` relationships.

Light record (what the galaxy renders from):

```jsonc
{ "id": "…", "slug": "github", "name": "GitHub", "url": "https://github.com/", "universeId": "…", "universeSlug": "development",
  "objectType": "star", "importance": 100, "popularityScore": 100, "trendingScore": 0, "trendDirection": "steady",
  "isTrending": false, "isEmerging": false, "accent": "#f0f6fc", "glyph": "GH", "topic": null, "logoUrl": null,
  "orbitAnchorId": null, "tags": ["git", "open-source"], "positionSeed": 584874290 }
```

`topic` (optional) names the website's neighbourhood inside its universe — websites sharing one are placed together. It groups; it never ranks or nests.

Full record adds `description`, `isActive`, `createdAt`, `updatedAt`, `relationships: Relationship[]`.

Relationship:

```jsonc
{ "id": "…", "type": "alternative", "directed": false, "strength": 1, "note": null,
  "source": { "id": "…", "slug": "github", "name": "GitHub" }, "target": { "id": "…", "slug": "gitlab", "name": "GitLab" } }
```

A relationship connects two websites as equals; `directed` is true only where the connection genuinely flows one way.

### Relationships
- `GET /api/relationships` — paginated (`page`, `limit` ≤ 500, `type`). Only relationships whose endpoints are both active.

### Search
- `GET /api/search?q=…&limit=12&universe=&type=` — rate limited (60/min). Returns `{ query, websites: [{ website, score, matched }], universes: [{ …universe, score }] }`. Every token must match (AND); the best field per token is summed (name > universe > tag > description), prominence breaks ties. `matched` is `name | universe | tag | description`.

### Discovery
- `GET /api/discovery/random?exclude=slug` — a random complete website (has URL and description). Rate limited.
- `GET /api/discovery/trending?limit=6` — websites flagged trending, strongest first. Cached 60 s. **Static / curated — not live traffic.**
- `GET /api/discovery/emerging?limit=6` — websites flagged emerging.

### Submissions
- `GET /api/submissions/check?url=…` → `{ valid, exists, pending, website: { slug, name } | null }` — non-destructive duplicate check for forms.
- `POST /api/submissions` — rate limited (5 per 10 min per client). Body:

```jsonc
{ "websiteName": "Example Tool", "url": "example-tool.dev", "description": "20–400 characters", "requestedUniverseId": "development", "tags": ["testing"] }
```

Returns 201 with the pending submission. URLs are normalised (scheme, `www.`, trailing slash, case) for duplicate detection; only public `http(s)` hosts are accepted. Nothing becomes visible until it is approved. A hidden `website` field is a honeypot and must stay empty.


## Security notes

- Helmet headers, CORS restricted to `CORS_ORIGINS` (any localhost port outside production), 64 KB body limit.
- Global rate limit `RATE_LIMIT_GLOBAL`/min; stricter limits on search, discovery, submissions and login.
- Passwords are scrypt-hashed; JWTs are signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN`.
- All input is validated with Zod; the database enforces uniqueness, foreign keys, check constraints and the no-self-relationship rule as well.
- Logs redact authorization headers, passwords and tokens.
