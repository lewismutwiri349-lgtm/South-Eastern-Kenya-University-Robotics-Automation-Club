# 16 — Monitoring & Logging

## 1. Purpose
Defines what gets logged, how errors are surfaced, and how we know the
platform is healthy — before something breaks, not just after.

## 2. What Gets Logged
- **Application errors** — every unhandled exception, with request context
  (route, method, user id if authenticated, timestamp), never with
  sensitive data (passwords, tokens, full payloads containing PII) in the
  log body.
- **Authentication events** — login success/failure, lockouts, password
  resets, session revocations (feeds the audit log per
  `08_Security_Standards.md` §7 for privilege-relevant ones).
- **Admin/moderation actions** — already required as audit log entries;
  also surfaced in operational logs for real-time visibility.
- **Slow requests** — any request exceeding its budget in
  `14_Performance_Standards.md` is logged with timing breakdown where
  feasible.

## 3. What Never Gets Logged
- Plaintext passwords, tokens, or session secrets — ever, even in debug
  builds.
- Full file contents of uploads.
- Unredacted personal data beyond what's operationally necessary (e.g. log
  a user id, not a user's full profile, when debugging an unrelated error).

## 4. Logging Infrastructure
- Cloudflare Workers' native logging (`console.log`/`console.error`, tailed
  via `wrangler tail` in dev, and Workers Logs/Logpush in production) is the
  baseline.
- Structured logging (JSON objects, not free-text strings) so logs are
  filterable/queryable — e.g. `{ level, domain, route, message, meta }`.
- If log volume or retention needs exceed Cloudflare's native tooling, an
  external sink (e.g. a logging service) is evaluated at that time — not
  pre-emptively added now.

## 5. Monitoring & Alerting
- Baseline health check endpoint (`/api/health`) on the backend Worker,
  used for uptime monitoring.
- Error rate and latency are tracked via Cloudflare Workers Analytics;
  thresholds for "needs attention" are defined once real traffic patterns
  exist (not guessed at pre-launch).
- Failed login spikes and repeated authorization failures are treated as a
  security signal, not just an error signal — reviewed against
  `08_Security_Standards.md`'s rate limiting and lockout rules.

## 6. Incident Response (lightweight, for a club-scale project)
1. Error surfaces via logs/alert.
2. Severity assessed: does it affect auth, data integrity, or file
   access (high) vs. a cosmetic/UI issue (low)?
3. High-severity issues get a `hotfix/` branch per `11_Git_Workflow.md`.
4. Root cause and fix are documented in the relevant module's doc under
   "Future Improvements" or a new "Incidents" note, so the same class of
   bug gets a regression test per `10_Testing_Standards.md`.
