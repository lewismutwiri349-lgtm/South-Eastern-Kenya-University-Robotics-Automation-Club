# 05 — API Standards

Written against the actual `backend/` scaffold from Module 1 (Hono on
Cloudflare Workers, mounted at `/api/<domain>/...`).

## 1. URL Structure
- Base path: `/api/<domain>/<resource>` — plural nouns, matching
  `docs/12_Coding_Standards.md` §4.
- Nested resources reflect real ownership: `/api/events/:id/register`,
  not flattened `/api/event-registrations`, when the nesting reflects the
  actual relationship.
- No versioning prefix (`/v1/`) for now — the API has no external consumers
  yet. If/when the API gains external consumers (mobile app, integrations),
  versioning is introduced deliberately, not pre-emptively.

## 2. Request/Response Shape
Every successful response:
```json
{
  "data": { ... },
  "meta": { }
}
```
`meta` is omitted when there's nothing to include (e.g. no pagination on a
single-resource GET).

Every error response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": [ { "field": "email", "issue": "Invalid email format" } ]
  }
}
```
`details` is omitted when not applicable (e.g. a 404). Never leak stack
traces, file paths, or internal error messages to the client — matches
`docs/08_Security_Standards.md` §3.

## 3. Status Codes
| Code | Meaning | When |
|---|---|---|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failure |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Authenticated but lacking permission |
| 404 | Not Found | Resource doesn't exist (or is soft-deleted) |
| 409 | Conflict | State conflict (e.g. duplicate registration) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled failure — logged per `docs/16_Monitoring_Logging.md` |

## 4. Pagination
List endpoints use cursor-based pagination:
```
GET /api/projects?limit=20&cursor=<opaque-cursor>
```
Response `meta` includes `nextCursor` (null when no more results). Offset-
based pagination (`?page=2`) is avoided — it performs poorly on larger
tables and produces inconsistent results when data changes between pages.

## 5. Filtering & Sorting
- Filters are explicit query params matching real fields:
  `?division=avionics&status=active`, not a generic query language, unless
  a specific module (e.g. Projects search) has a documented reason to need
  one.
- Sorting: `?sort=createdAt&order=desc`, defaulting to a sensible order per
  resource (usually newest first) when omitted.

## 6. Authentication
- Session token sent via `httpOnly` cookie, per `docs/08_Security_Standards.md` §1
  — never expected in a request body or query string.
- Every protected route's required role/permission is declared in the
  route's middleware chain, not buried in handler logic — matches
  `docs/08_Security_Standards.md` §2.

## 7. Idempotency
- `PUT` and `DELETE` are idempotent by definition — repeating the same
  request produces the same end state.
- For `POST` operations where accidental double-submission is a real risk
  (e.g. event registration, application submission), the service layer
  checks for an existing record before creating a duplicate, returning 409
  rather than creating a second row.

## 8. Rate Limiting Headers
Rate-limited routes (per `docs/08_Security_Standards.md` §5) return:
```
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```
so clients (and our own frontend) can react before hitting 429.

## 9. What Every New Route Documents
Per `docs/13_Documentation_Standards.md` §1, every route added in a module
is documented with: method, path, auth requirement, request shape, response
shape, and possible error codes — matching the conventions in this document.
