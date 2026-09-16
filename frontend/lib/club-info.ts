/**
 * Real-world contact details for the club.
 *
 * These are deliberately BLANK, not placeholder values. Per
 * `docs/00_Project_Constitution.md` §2 ("never fabricate", "no placeholder
 * or mock logic"), inventing an email address or a room number that looks
 * real is worse than showing nothing — a visitor would email into the void
 * and never tell us. Every consumer of this file renders only the entries
 * that are non-empty, so the Contact page is correct and presentable in
 * either state.
 *
 * TRACKED FOLLOW-UP (docs/modules/contact.md §7): the project owner fills
 * these in. No code change is needed elsewhere when they do.
 */
export type ClubContactDetails = {
  email: string;
  location: string;
  meetingTimes: string;
  socials: { label: string; url: string }[];
};

export const CLUB_CONTACT: ClubContactDetails = {
  email: "",
  location: "",
  meetingTimes: "",
  socials: [],
};

export function hasAnyContactDetails(details: ClubContactDetails): boolean {
  return Boolean(
    details.email || details.location || details.meetingTimes || details.socials.length > 0
  );
}
