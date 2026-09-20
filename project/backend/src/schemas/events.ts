import { z } from "zod";

export const createEventSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(50_000),
    location: z.string().min(1).max(300),
    startAt: z.coerce.date(),
    endAt: z.coerce.date().optional(),
    // Omitted/undefined = uncapped. Confirmed with Lewis 2026-08-14:
    // capacity is optional per event, not mandatory.
    capacity: z.coerce.number().int().min(1).optional(),
  })
  .refine((data) => !data.endAt || data.endAt >= data.startAt, {
    message: "endAt must be at or after startAt",
    path: ["endAt"],
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(50_000).optional(),
    location: z.string().min(1).max(300).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    capacity: z.coerce.number().int().min(1).nullable().optional(),
  })
  .refine((data) => !data.endAt || !data.startAt || data.endAt >= data.startAt, {
    message: "endAt must be at or after startAt",
    path: ["endAt"],
  });
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4.
export const listEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

// Cursor-based pagination per docs/05_API_Standards.md §4 — used for the
// organizer-facing registrant list.
export const listRegistrationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;
