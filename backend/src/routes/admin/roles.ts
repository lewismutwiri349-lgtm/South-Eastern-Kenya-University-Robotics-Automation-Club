/**
 * Shared role sets for the Administration domain's routes — defined once
 * per docs/12_Coding_Standards.md §7 rather than repeated per route file.
 * See docs/07_User_Roles.md's Administration Domain section for rationale.
 */

/** Roster visibility and applicant-lifecycle decisions — routine admin work. */
export const ADMIN_STAFF_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary"] as const;

/** Granting roles is a governance action, narrower than roster visibility. */
export const ROLE_GRANT_ROLES = ["super_admin", "chairperson"] as const;
