import { generateId } from "../../lib/id-generator";

/**
 * Core application business logic for the Applicant Portal.
 */

export interface ApplicationData {
  id: string;
  userId: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  divisionPreferencePrimary: string | null;
  divisionPreferenceSecondary: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Submit or create a draft application for an applicant.
 * Idempotent — resubmitting updates the existing record and advances status from draft to submitted.
 */
export async function submitApplication(
  database: D1Database,
  userId: string,
  email: string,
  data: {
    firstName: string;
    lastName: string;
    bio?: string | null;
    divisionPreferencePrimary?: string | null;
    divisionPreferenceSecondary?: string | null;
  }
): Promise<ApplicationData> {
  const now = new Date();
  const appId = generateId();

  // Check if application already exists for this user
  const existing = await database
    .prepare(`SELECT id, status FROM applications WHERE user_id = ?`)
    .bind(userId)
    .first<{ id: string; status: string }>();

  if (existing) {
    // Update existing application, advance from draft to submitted
    const updated = await database
      .prepare(
        `
        UPDATE applications
        SET
          first_name = ?,
          last_name = ?,
          bio = ?,
          division_preference_primary = ?,
          division_preference_secondary = ?,
          status = ?,
          submitted_at = ?,
          updated_at = ?
        WHERE user_id = ?
        RETURNING *
      `
      )
      .bind(
        data.firstName,
        data.lastName,
        data.bio || null,
        data.divisionPreferencePrimary || null,
        data.divisionPreferenceSecondary || null,
        "submitted",
        Math.floor(now.getTime() / 1000),
        Math.floor(now.getTime() / 1000),
        userId
      )
      .first<ApplicationData>();

    if (!updated) throw new Error("Failed to update application");
    return updated;
  }

  // Create new application as draft
  const created = await database
    .prepare(
      `
      INSERT INTO applications (
        id, user_id, status, first_name, last_name, email, bio,
        division_preference_primary, division_preference_secondary,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      appId,
      userId,
      "draft",
      data.firstName,
      data.lastName,
      email,
      data.bio || null,
      data.divisionPreferencePrimary || null,
      data.divisionPreferenceSecondary || null,
      Math.floor(now.getTime() / 1000),
      Math.floor(now.getTime() / 1000)
    )
    .first<ApplicationData>();

  if (!created) throw new Error("Failed to create application");
  return created;
}

/**
 * Fetch an application by user ID.
 */
export async function getApplicationByUserId(
  database: D1Database,
  userId: string
): Promise<ApplicationData | null> {
  const app = await database
    .prepare(`SELECT * FROM applications WHERE user_id = ? AND deleted_at IS NULL`)
    .bind(userId)
    .first<ApplicationData>();

  return app || null;
}

/**
 * Update application status (used internally by test and interview services).
 */
export async function updateApplicationStatus(
  database: D1Database,
  applicationId: string,
  newStatus: string
): Promise<void> {
  const now = new Date();
  await database
    .prepare(
      `
      UPDATE applications
      SET status = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .bind(newStatus, Math.floor(now.getTime() / 1000), applicationId)
    .run();
}

/**
 * Check if an application exists and is in the required status.
 */
export async function requireApplicationStatus(
  database: D1Database,
  applicationId: string,
  requiredStatus: string
): Promise<ApplicationData> {
  const app = await database
    .prepare(`SELECT * FROM applications WHERE id = ? AND deleted_at IS NULL`)
    .bind(applicationId)
    .first<ApplicationData>();

  if (!app) {
    throw new Error("Application not found");
  }

  if (app.status !== requiredStatus) {
    throw new Error(`Application status must be '${requiredStatus}', got '${app.status}'`);
  }

  return app;
}
