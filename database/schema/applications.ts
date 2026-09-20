import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./identity";

/**
 * Applications domain — Applicant Portal Phase 3.
 * Tracks application lifecycle from submission through interview.
 */

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "testing",
  "test_passed",
  "test_failed",
  "interview_scheduled",
  "interviewed",
  "accepted",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    status: text("status").notNull().default("draft"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    bio: text("bio"),
    divisionPreferencePrimary: text("division_preference_primary"),
    divisionPreferenceSecondary: text("division_preference_secondary"),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("applications_user_id_idx").on(table.userId),
    statusIdx: index("applications_status_idx").on(table.status),
    submittedAtIdx: index("applications_submitted_at_idx").on(table.submittedAt),
  })
);

/**
 * Aptitude test instance for an applicant.
 * One row per attempt. Multiple attempts allowed (max 3) until passing.
 */
export const aptitudeTests = sqliteTable(
  "aptitude_tests",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id),
    score: integer("score"), // 0-100, null until submitted
    passed: integer("passed", { mode: "boolean" }), // null until submitted
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    applicationIdIdx: index("aptitude_tests_application_id_idx").on(table.applicationId),
  })
);

/**
 * Test question bank seed data.
 * 50 questions total; 20 are randomly selected for each test attempt.
 */
export const testQuestions = sqliteTable(
  "test_questions",
  {
    id: text("id").primaryKey(),
    text: text("text").notNull(),
    options: text("options").notNull(), // JSON array: ["A", "B", "C", "D"]
    correctAnswerIndex: integer("correct_answer_index").notNull(), // 0-3
    difficulty: text("difficulty").notNull(), // "easy", "medium", "hard"
    topic: text("topic").notNull(), // "statics", "dynamics", "circuits", etc.
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    topicIdx: index("test_questions_topic_idx").on(table.topic),
  })
);

/**
 * Test answers submitted by an applicant.
 * One row per question per test attempt.
 */
export const testAnswers = sqliteTable(
  "test_answers",
  {
    id: text("id").primaryKey(),
    testId: text("test_id")
      .notNull()
      .references(() => aptitudeTests.id),
    questionId: text("question_id")
      .notNull()
      .references(() => testQuestions.id),
    answerIndex: integer("answer_index").notNull(), // 0-3
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    testIdIdx: index("test_answers_test_id_idx").on(table.testId),
    questionIdIdx: index("test_answers_question_id_idx").on(table.questionId),
  })
);

/**
 * Available interview time slots (admin-seeded).
 * Represents a scheduled time block for interviews.
 */
export const interviewSlots = sqliteTable(
  "interview_slots",
  {
    id: text("id").primaryKey(),
    startTime: integer("start_time", { mode: "timestamp" }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    maxCapacity: integer("max_capacity").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    startTimeIdx: index("interview_slots_start_time_idx").on(table.startTime),
  })
);

/**
 * Scheduled interviews for applicants.
 * One row per applicant per scheduled interview (unique constraint).
 */
export const interviewSchedules = sqliteTable(
  "interview_schedules",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .unique()
      .references(() => applications.id),
    slotId: text("slot_id")
      .notNull()
      .references(() => interviewSlots.id),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    applicationIdIdx: uniqueIndex("interview_schedules_application_id_idx").on(table.applicationId),
    slotIdIdx: index("interview_schedules_slot_id_idx").on(table.slotId),
  })
);
