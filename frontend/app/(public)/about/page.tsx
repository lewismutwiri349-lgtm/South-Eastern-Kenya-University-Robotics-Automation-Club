import { Card, Container, Designator } from "@/components/ui";

const VALUES = [
  {
    id: "01",
    title: "Build to spec, not to grade",
    body: "Every project has a real requirement document and a real deadline — competition rules, a client brief, or a hardware constraint. We hold ourselves to that, not a rubric.",
  },
  {
    id: "02",
    title: "Document like someone else will finish it",
    body: "Members graduate. Projects shouldn't die with them. Every project ships with documentation good enough for next year's team to pick up cold.",
  },
  {
    id: "03",
    title: "Cross the division lines",
    body: "A robot needs mechanical, electrical, software, and controls working together on the same timeline. We structure the club so those teams actually talk to each other.",
  },
];

export default function AboutPage() {
  return (
    <main>
      <Container style={{ paddingTop: "var(--space-12)", paddingBottom: "var(--space-16)" }}>
        <Designator>ABOUT THE CLUB</Designator>
        <h1 style={{ fontSize: 40, marginTop: "var(--space-3)", maxWidth: 700 }}>
          A student-run engineering club, run like a small engineering org.
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", marginTop: "var(--space-4)", maxWidth: 640 }}>
          We&apos;re organized into divisions, not just interest groups — each with a lead, a
          budget, and a project pipeline. Members take on real responsibility from their first
          semester.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--space-4)",
            marginTop: "var(--space-12)",
          }}
        >
          {VALUES.map((value) => (
            <Card key={value.id}>
              <Designator>PRINCIPLE.{value.id}</Designator>
              <h3 style={{ fontSize: 18, marginTop: "var(--space-2)" }}>{value.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                {value.body}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
