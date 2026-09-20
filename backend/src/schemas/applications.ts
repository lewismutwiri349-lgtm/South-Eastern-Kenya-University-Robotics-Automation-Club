import { z } from "zod";

/**
 * Validation schemas for the Applications domain (Applicant Portal Phase 3).
 */

export const applicationSubmissionSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  bio: z.string().max(1000).optional().nullable(),
  divisionPreferencePrimary: z.string().max(100).optional().nullable(),
  divisionPreferenceSecondary: z.string().max(100).optional().nullable(),
});

export type ApplicationSubmission = z.infer<typeof applicationSubmissionSchema>;

export const testSubmissionSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      answerIndex: z.number().int().min(0).max(3),
    })
  ),
});

export type TestSubmission = z.infer<typeof testSubmissionSchema>;

export const interviewSchedulingSchema = z.object({
  slotId: z.string(),
});

export type InterviewScheduling = z.infer<typeof interviewSchedulingSchema>;
