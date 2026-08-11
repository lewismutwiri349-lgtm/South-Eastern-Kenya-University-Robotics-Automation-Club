import { Card, Container, Designator } from "@/components/ui";

/**
 * Static for now. Real division records (with a Division Head, member
 * roster, and active projects) belong to the Membership domain per
 * docs/01_Product_Vision.md — not built yet. This list will be wired to
 * real data when that domain is built; kept deliberately minimal here
 * rather than fabricating a data model prematurely.
 */
const DIVISIONS = [
  {
    code: "DIV.01",
    name: "Software",
    body: "Autonomy stacks, perception, and the tooling every other division depends on — from robot firmware to the club's own platform.",
  },
  {
    code: "DIV.02",
    name: "Mechanical",
    body: "Structural design, drivetrains, and manufacturing. If it has to survive an impact or hold a tolerance, it comes through here.",
  },
  {
    code: "DIV.03",
    name: "Electrical",
    body: "Power systems, custom PCBs, and wiring harnesses. Keeps every robot's electronics reliable under competition conditions.",
  },
  {
    code: "DIV.04",
    name: "Controls",
    body: "Feedback loops, motor control, and the layer between software's intent and the hardware's motion.",
  },
  {
    code: "DIV.05",
    name: "AI / ML",
    body: "Computer vision, planning, and learned behaviors — the newest division, growing fastest.",
  },
];

export default function DivisionsPage() {
  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>ORGANIZATION</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)", maxWidth: 700 }}>
          Five divisions, each running its own projects.
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", marginTop: "var(--space-4)", maxWidth: 640 }}>
          Every member joins a division on top of the club at large. Divisions set their own
          project roadmap and meet weekly.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-10)" }}>
          {DIVISIONS.map((division) => (
            <Card key={division.code} style={{ display: "flex", gap: "var(--space-6)", alignItems: "baseline" }}>
              <Designator>{division.code}</Designator>
              <div>
                <h3 style={{ fontSize: 18 }}>{division.name}</h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                  {division.body}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
