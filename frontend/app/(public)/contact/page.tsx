import { ContactForm } from "@/components/ContactForm";
import { Card, Container, Designator } from "@/components/ui";
import { CLUB_CONTACT, hasAnyContactDetails } from "@/lib/club-info";

export const metadata = {
  title: "Contact — Robotics & Autonomous Systems Club",
  description: "Get in touch with the Robotics & Autonomous Systems Club committee.",
};

export default function ContactPage() {
  const showDetails = hasAnyContactDetails(CLUB_CONTACT);

  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>GET IN TOUCH</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)" }}>Contact</h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--text-secondary)",
            marginTop: "var(--space-4)",
            maxWidth: 620,
          }}
        >
          Questions about joining, sponsorship, collaborations, or a project you&apos;ve seen here —
          send it through and the committee will pick it up.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: showDetails ? "minmax(0, 1.6fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
            gap: "var(--space-8)",
            alignItems: "start",
            marginTop: "var(--space-12)",
            maxWidth: showDetails ? undefined : 640,
          }}
        >
          <ContactForm />

          {showDetails && (
            <Card>
              <Designator>DIRECT</Designator>

              {CLUB_CONTACT.email && (
                <p style={{ fontSize: 14, marginTop: "var(--space-3)" }}>
                  <a href={`mailto:${CLUB_CONTACT.email}`}>{CLUB_CONTACT.email}</a>
                </p>
              )}

              {CLUB_CONTACT.location && (
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    marginTop: "var(--space-3)",
                  }}
                >
                  {CLUB_CONTACT.location}
                </p>
              )}

              {CLUB_CONTACT.meetingTimes && (
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    marginTop: "var(--space-3)",
                  }}
                >
                  {CLUB_CONTACT.meetingTimes}
                </p>
              )}

              {CLUB_CONTACT.socials.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--space-3)",
                    marginTop: "var(--space-4)",
                  }}
                >
                  {CLUB_CONTACT.socials.map((social) => (
                    <a
                      key={social.url}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--secondary)",
                      }}
                    >
                      {social.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </Container>
    </main>
  );
}
