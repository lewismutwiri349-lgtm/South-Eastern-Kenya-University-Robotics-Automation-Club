# Applicant Portal — Phase 3

## 1. Feature Overview

The Applicant Portal is the entry point for new club members. A registered user (role: `applicant`) can:
1. **Submit an application** — personal background, engineering interests, division preferences
2. **Take an aptitude test** — timed, multiple-choice questions testing fundamental engineering knowledge
3. **Answer engineering scenarios** — open-ended questions demonstrating problem-solving approach
4. **Track application status** — view current stage (submitted, testing, interview, accepted/rejected)
5. **Schedule interviews** — book time slots after passing the aptitude test

This is the first Applicant Portal slice — the five features above. Interview follow-ups, background checks, and batch acceptance are deferred.

## 2. Architecture

### Database (`database/schema/applications.ts`)
Four new tables:
- `applications` — core application record (personal data, status, timestamps)
- `aptitude_tests` — test instance (start time, end time, score, attempt count)
- `test_questions` — seed data for the test question bank
- `interview_slots` — available interview time slots
- `interview_schedules` — scheduled interviews per applicant

### Backend (`backend/src/services/applications/` and `backend/src/routes/applications/`)
- `applications-service.ts` — create, fetch, update application status
- `aptitude-test-service.ts` — start test, save answers, calculate score, retrieve results
- `interview-service.ts` — list available slots, schedule interview, retrieve scheduled interviews
- `repository.ts` — shared data access

Route files (one per endpoint):
- `submit.ts` — `POST /api/applications/submit`
- `get.ts` — `GET /api/applications/:id`
- `start-test.ts` — `POST /api/applications/:id/start-test`
- `submit-test.ts` — `POST /api/applications/:id/submit-test`
- `get-test-result.ts` — `GET /api/applications/:id/test-result`
- `list-interview-slots.ts` — `GET /api/applications/interview-slots`
- `schedule-interview.ts` — `POST /api/applications/:id/schedule-interview`
- `get-interviews.ts` — `GET /api/applications/:id/interviews`

### Frontend (`frontend/app/(applicant)/`)
- `page.tsx` — applicant portal home/dashboard
- `apply/page.tsx` — application form (multi-step)
- `test/page.tsx` — aptitude test interface (timed, question display, progress)
- `status/page.tsx` — application status view with timeline
- `schedule-interview/page.tsx` — interview booking UI

### API Validation (`backend/src/schemas/`)
- `application-submission.ts` — Zod schema for application form
- `test-submission.ts` — Zod schema for test answers
- `interview-scheduling.ts` — Zod schema for interview booking

## 3. API Endpoints

### Application Submission
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/applications/submit` | `applicant` | Submits application (name, email, bio, division preferences). Idempotent — resubmitting updates the draft, returns existing ID if already submitted. |
| GET | `/api/applications/:id` | `applicant` (own only) | Fetch application details and current status |

### Aptitude Test
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/applications/:id/start-test` | `applicant` (own only) | Starts the test (begins timer, retrieves 20 randomized questions from the bank). Returns test session ID and questions. `409` if already started/passed. |
| POST | `/api/applications/:id/submit-test` | `applicant` (own only) | Submits test answers (array of question_id → answer_index). Calculates score immediately. Returns score and pass/fail. |
| GET | `/api/applications/:id/test-result` | `applicant` (own only) | Fetches test result (score, pass/fail, timestamp) or `404` if not taken yet. |

### Interview Scheduling
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/applications/interview-slots` | `applicant` | Lists available 30-minute interview slots (next 14 days). Returns array of `{id, startTime, duration, available: boolean}`. |
| POST | `/api/applications/:id/schedule-interview` | `applicant` (own only) | Books an interview slot. `400` if slot is full. `409` if already scheduled for interview. Returns scheduled interview details. |
| GET | `/api/applications/:id/interviews` | `applicant` (own only) | Fetches scheduled interviews for this applicant (normally 1, but returns array for consistency). |

## 4. Database Schema

### `applications`
Tracks the application's lifecycle.
- `id` (UUID, PK)
- `user_id` (FK → users.id, unique, indexed)
- `status` (enum: `draft`, `submitted`, `testing`, `test_passed`, `test_failed`, `interview_scheduled`, `interviewed`, `accepted`, `rejected`) — hard-coded list, not a separate table
- `first_name` (text)
- `last_name` (text)
- `email` (text) — denormalized from user for historical record
- `bio` (text, optional) — short personal statement
- `division_preference_primary` (text, optional) — e.g. "avionics", "software" (freeform for now, no validation against a divisions list)
- `division_preference_secondary` (text, optional)
- `submitted_at` (timestamp, nullable) — null until explicitly submitted
- `deleted_at` (timestamp, nullable) — soft delete
- `created_at`, `updated_at` (timestamps)

Indexes:
- `user_id` (unique)
- `status`
- `submitted_at`

### `aptitude_tests`
One row per test attempt per applicant.
- `id` (UUID, PK)
- `application_id` (FK → applications.id, indexed)
- `score` (integer, 0–100, nullable) — null until submitted
- `passed` (boolean, nullable) — null until submitted; threshold 60/100
- `started_at` (timestamp)
- `submitted_at` (timestamp, nullable)
- `created_at`, `updated_at` (timestamps)

Indexes:
- `application_id`

### `test_questions`
Seed data — 50 questions in the bank, randomly sampled.
- `id` (UUID, PK)
- `text` (text) — question text
- `options` (JSON array of 4 strings: ["A", "B", "C", "D"])
- `correct_answer_index` (integer: 0–3)
- `difficulty` (text: "easy", "medium", "hard") — for seed data only, not used in test logic yet
- `topic` (text: "statics", "dynamics", "circuits", "programming", "thermodynamics", etc.)
- `created_at` (timestamp)

### `interview_slots`
Admin-seeded available interview times.
- `id` (UUID, PK)
- `start_time` (timestamp, indexed)
- `duration_minutes` (integer, default 30)
- `max_capacity` (integer, default 1 — one applicant per slot)
- `created_at` (timestamp)

Index: `start_time`

### `interview_schedules`
Booked interviews.
- `id` (UUID, PK)
- `application_id` (FK → applications.id, unique, indexed)
- `slot_id` (FK → interview_slots.id, indexed)
- `scheduled_at` (timestamp) — when the booking was made
- `cancelled_at` (timestamp, nullable)
- `created_at`, `updated_at` (timestamps)

Indexes:
- `application_id` (unique)
- `slot_id`

## 5. Permissions

| Route | Allowed Roles |
|---|---|
| `POST /api/applications/submit` | `applicant` |
| `GET /api/applications/:id` | `applicant` (own only) — enforced in service layer |
| `POST /api/applications/:id/start-test` | `applicant` (own only) |
| `POST /api/applications/:id/submit-test` | `applicant` (own only) |
| `GET /api/applications/:id/test-result` | `applicant` (own only) |
| `GET /api/applications/interview-slots` | `applicant` |
| `POST /api/applications/:id/schedule-interview` | `applicant` (own only) |
| `GET /api/applications/:id/interviews` | `applicant` (own only) |

## 6. Business Rules

### Application Submission
1. An applicant can submit an application once. Resubmitting updates the draft and advances status from `draft` to `submitted`.
2. Once submitted, an applicant cannot edit their application.
3. An application is required before taking the aptitude test — `POST /start-test` checks `status >= submitted`.

### Aptitude Test
1. A test is **timed at 30 minutes**. The frontend enforces this via `startTime + 30min`.
2. Questions are randomized — 20 out of 50 total questions, sampled randomly at test start.
3. Each question has 4 multiple-choice options; answers are stored as indices (0–3).
4. Passing score is **60/100** (12 out of 20 correct).
5. An applicant can retake the test up to 3 times. After 3 failures, the application is marked `test_failed` permanently and cannot be restarted.
6. Once an applicant passes, their application status becomes `test_passed` and they can schedule interviews.

### Interview Scheduling
1. Interview slots are seeded by admin (not a Phase 3 feature — see Future Work §8). Slots are 30 minutes each.
2. Slots are first-come-first-served; once `max_capacity` applicants are scheduled, the slot is marked unavailable.
3. An applicant with `test_passed` status can schedule an interview once. Re-scheduling after cancellation is allowed, but this is a future feature.
4. Interview scheduling does not automatically change application status; status updates happen via a future Admin Portal (Phase 6) when an interview is conducted.

## 7. Edge Cases Handled

### Data Integrity
- If an applicant deletes their account, their application is soft-deleted but the record remains for audit.
- Test attempts are immutable — a submitted test cannot be updated.
- Interview slots cannot be double-booked — unique constraint on `(slot_id)` in combination with a check on `max_capacity`.

### Workflow Validation
- Cannot start a test without a submitted application.
- Cannot schedule an interview without passing the aptitude test.
- Cannot submit an application after it's been rejected (future check in Phase 6).

### Timing
- Test timer is enforced client-side (JavaScript) and server-side (comparison of submitted_at vs started_at; server rejects answers submitted >30min after start).
- Interview slot availability is checked at booking time — no race conditions are possible since D1 is single-writer.

## 8. Tests

### Unit Tests (`backend/tests/unit/applications/`)
- `applications-service.test.ts` — create, update status, fetch
- `aptitude-test-service.test.ts` — randomization, score calculation (100% = 20/20, 50% = 10/20, etc.), pass/fail logic, retake limits
- `interview-service.test.ts` — slot availability, capacity checking, booking validation

### Integration Tests (`backend/tests/integration/applications/`)
- Full application submission flow
- Test start → randomized questions → submit → score calculation
- Interview slot query and booking

### API Tests (`backend/tests/api/applications/`)
- `submit.test.ts` — success, validation errors (missing fields), idempotency, role boundary (applicant only)
- `start-test.test.ts` — success, `409` if already passed, `401`/`403` unauthorized
- `submit-test.test.ts` — success, time-limit enforcement (reject if >30min past start), wrong answer format
- `get-test-result.test.ts` — success, `404` if not taken
- `schedule-interview.test.ts` — success, `400` if slot full, `409` if already scheduled, role boundary
- `list-interview-slots.test.ts` — returns available slots only, no capacity check for listing

### UI Tests (`frontend/app/(applicant)/*.test.tsx`)
- Application form renders, validates required fields, shows success/error states
- Test timer displays and counts down
- Interview slot selection, confirmation, success message

## 9. Frontend

### Application Form (`frontend/app/(applicant)/apply/page.tsx`)
- Multi-step form (if desired; single-step is acceptable): personal info → division preferences → submit.
- Form state managed with React hooks (no external state management).
- Shows loading spinner on submit; displays error message if submission fails.
- Redirects to `/applicant/status` after successful submission.

### Aptitude Test (`frontend/app/(applicant)/test/page.tsx`)
- Full-screen test interface (no navigation visible during test).
- Timer in top-right, styled red when < 5 minutes remain.
- Question counter (e.g. "Question 3 of 20").
- "Next", "Previous", "Finish Test" buttons.
- Confirms before final submission ("Are you sure?").
- On submit, shows loading spinner and locks all interaction.
- Displays score and pass/fail result; links to `/applicant/schedule-interview` if passed.

### Status View (`frontend/app/(applicant)/status/page.tsx`)
- Timeline showing: submitted → testing → (test_passed or test_failed) → (interview_scheduled / interviewed / accepted / rejected).
- Current step highlighted.
- Links to relevant next actions ("Take Test", "Schedule Interview", "View Scheduled Interview").

### Interview Scheduling (`frontend/app/(applicant)/schedule-interview/page.tsx`)
- Calendar/list of available slots (next 14 days).
- Date/time display in applicant's local timezone (browser timezone).
- Click to select a slot; confirm booking.
- Show success message and display scheduled interview details.

## 10. Security

### Authorization
- `(applicant)` route group is protected by middleware checking `role === "applicant"` and `emailVerifiedAt !== null`.
- Every service function checking applicant ownership compares `application.user_id === req.userId` before returning data.
- No applicant can view another applicant's application, test results, or interviews.

### Rate Limiting
- Test submission is rate-limited to 1 per applicant per day (enforce via unique `(application_id, submitted_at)` or a counter).
- Interview scheduling is rate-limited to 1 per applicant (unique constraint).

### Test Integrity
- Answers are stored server-side; frontend cannot inspect correct answers before submission.
- Timer is enforced server-side; a submitted test with `submitted_at > started_at + 30min` is rejected.
- Question order is randomized server-side at test start, not client-side.

## 11. Performance

### Queries
- Listing interview slots: indexes on `start_time` allow fast filtering.
- Fetching application: indexed on `user_id`.
- Fetching test result: indexed on `application_id`.

### Limits
- Test questions: 20 per test (fixed), sampled from 50 total (seeded).
- Interview slots listing: next 14 days only.
- Cursor pagination not needed for these endpoints (small result sets).

## 12. Future Work (deferred beyond Phase 3)

1. **Admin Interview Management** (Phase 6) — staff can create interview slots, mark attended, record scores, make admission decisions.
2. **Interview Follow-ups** — automated reminders, no-show handling, rescheduling.
3. **Bulk Acceptance/Rejection** — admin dashboard for final decisions.
4. **Test Analytics** — pass rates by question, topic performance tracking.
5. **Re-scheduling Interviews** — applicants can cancel and reschedule after an interview.
6. **Adaptive Testing** — difficulty adjusts based on answers (future enhancement).
7. **ATS Integration** — external applicant tracking system sync.

## Changelog

- **2026-09-20** — Phase 3 Applicant Portal module specification written. Five core features: application submission, aptitude test, scenario questions deferred, status tracking, interview scheduling. Two tables (applications, aptitude_tests, test_questions, interview_slots, interview_schedules). Eight API endpoints. Frontend dashboard, form, test UI, and interview booking. Full RBAC enforcement and rate limiting per security standards.
