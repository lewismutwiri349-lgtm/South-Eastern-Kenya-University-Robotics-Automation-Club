import { generateId } from "../../lib/id-generator";
import { updateApplicationStatus } from "./applications-service";

/**
 * Interview scheduling business logic.
 * Manages available slots and applicant bookings.
 */

export interface InterviewSlot {
  id: string;
  startTime: Date;
  durationMinutes: number;
  maxCapacity: number;
  createdAt: Date;
  available?: boolean; // True if slots remain
}

export interface ScheduledInterview {
  id: string;
  applicationId: string;
  slotId: string;
  slotStartTime: Date;
  slotDurationMinutes: number;
  scheduledAt: Date;
  cancelledAt: Date | null;
  createdAt: Date;
}

/**
 * List available interview slots for the next 14 days.
 * Returns only slots with available capacity.
 */
export async function listAvailableSlots(database: D1Database): Promise<InterviewSlot[]> {
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const slotsResult = await database
    .prepare(
      `
      SELECT
        s.id,
        s.start_time,
        s.duration_minutes,
        s.max_capacity,
        s.created_at,
        COUNT(i.id) as booked_count
      FROM interview_slots s
      LEFT JOIN interview_schedules i ON s.id = i.slot_id AND i.cancelled_at IS NULL
      WHERE s.start_time >= ? AND s.start_time <= ?
      GROUP BY s.id, s.start_time, s.duration_minutes, s.max_capacity, s.created_at
      ORDER BY s.start_time ASC
    `
    )
    .bind(Math.floor(now.getTime() / 1000), Math.floor(twoWeeksFromNow.getTime() / 1000))
    .all<{
      id: string;
      start_time: number;
      duration_minutes: number;
      max_capacity: number;
      created_at: number;
      booked_count: number;
    }>();

  const slots = slotsResult.results || [];

  if (!slots) return [];

  return slots.map((slot) => ({
    id: slot.id,
    startTime: new Date(slot.start_time * 1000),
    durationMinutes: slot.duration_minutes,
    maxCapacity: slot.max_capacity,
    createdAt: new Date(slot.created_at * 1000),
    available: slot.booked_count < slot.max_capacity,
  }));
}

/**
 * Schedule an interview for an applicant.
 * Checks that:
 * 1. The applicant has passed the test
 * 2. The slot exists and has capacity
 * 3. The applicant hasn't already scheduled an interview
 */
export async function scheduleInterview(
  database: D1Database,
  applicationId: string,
  slotId: string
): Promise<ScheduledInterview> {
  const now = new Date();

  // Check if applicant has passed the test
  const testResult = await database
    .prepare(
      `
      SELECT passed FROM aptitude_tests
      WHERE application_id = ? AND passed = 1
      LIMIT 1
    `
    )
    .bind(applicationId)
    .first<{ passed: boolean }>();

  if (!testResult) {
    throw new Error("Applicant must pass the aptitude test first");
  }

  // Check if applicant already has a scheduled interview
  const existing = await database
    .prepare(
      `
      SELECT id FROM interview_schedules
      WHERE application_id = ? AND cancelled_at IS NULL
      LIMIT 1
    `
    )
    .bind(applicationId)
    .first<{ id: string }>();

  if (existing) {
    throw new Error("Applicant already has a scheduled interview");
  }

  // Check slot exists and has capacity
  const slot = await database
    .prepare(
      `
      SELECT
        s.id,
        s.start_time,
        s.duration_minutes,
        s.max_capacity,
        COUNT(i.id) as booked_count
      FROM interview_slots s
      LEFT JOIN interview_schedules i ON s.id = i.slot_id AND i.cancelled_at IS NULL
      WHERE s.id = ?
      GROUP BY s.id
    `
    )
    .bind(slotId)
    .first<{
      id: string;
      start_time: number;
      duration_minutes: number;
      max_capacity: number;
      booked_count: number;
    }>();

  if (!slot) {
    throw new Error("Interview slot not found");
  }

  if (slot.booked_count >= slot.max_capacity) {
    throw new Error("Interview slot is full");
  }

  // Book the interview
  const scheduleId = generateId();
  const scheduled = await database
    .prepare(
      `
      INSERT INTO interview_schedules (
        id, application_id, slot_id, scheduled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `
    )
    .bind(
      scheduleId,
      applicationId,
      slotId,
      Math.floor(now.getTime() / 1000),
      Math.floor(now.getTime() / 1000),
      Math.floor(now.getTime() / 1000)
    )
    .first<{
      id: string;
      application_id: string;
      slot_id: string;
      scheduled_at: number;
      cancelled_at: number | null;
      created_at: number;
    }>();

  if (!scheduled) throw new Error("Failed to schedule interview");

  // Update application status
  await updateApplicationStatus(database, applicationId, "interview_scheduled");

  return {
    id: scheduled.id,
    applicationId: scheduled.application_id,
    slotId: scheduled.slot_id,
    slotStartTime: new Date(slot.start_time * 1000),
    slotDurationMinutes: slot.duration_minutes,
    scheduledAt: new Date(scheduled.scheduled_at * 1000),
    cancelledAt: scheduled.cancelled_at ? new Date(scheduled.cancelled_at * 1000) : null,
    createdAt: new Date(scheduled.created_at * 1000),
  };
}

/**
 * Get scheduled interviews for an applicant.
 */
export async function getScheduledInterviews(
  database: D1Database,
  applicationId: string
): Promise<ScheduledInterview[]> {
  const interviewsResult = await database
    .prepare(
      `
      SELECT
        i.id,
        i.application_id,
        i.slot_id,
        s.start_time,
        s.duration_minutes,
        i.scheduled_at,
        i.cancelled_at,
        i.created_at
      FROM interview_schedules i
      JOIN interview_slots s ON i.slot_id = s.id
      WHERE i.application_id = ? AND i.cancelled_at IS NULL
      ORDER BY s.start_time ASC
    `
    )
    .bind(applicationId)
    .all<{
      id: string;
      application_id: string;
      slot_id: string;
      start_time: number;
      duration_minutes: number;
      scheduled_at: number;
      cancelled_at: number | null;
      created_at: number;
    }>();

  const interviews = interviewsResult.results || [];

  if (!interviews) return [];

  return interviews.map((i) => ({
    id: i.id,
    applicationId: i.application_id,
    slotId: i.slot_id,
    slotStartTime: new Date(i.start_time * 1000),
    slotDurationMinutes: i.duration_minutes,
    scheduledAt: new Date(i.scheduled_at * 1000),
    cancelledAt: i.cancelled_at ? new Date(i.cancelled_at * 1000) : null,
    createdAt: new Date(i.created_at * 1000),
  }));
}
