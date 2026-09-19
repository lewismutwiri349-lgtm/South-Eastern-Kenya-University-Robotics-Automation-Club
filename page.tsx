import { Button, Card, Container, Designator } from "@/components/ui";
import { CircuitTrace } from "@/components/CircuitTrace";

const WHAT_WE_DO = [
  {
    id: "DES",
    title: "Design",
    body: "Every project starts on the whiteboard and in CAD — spec it, simulate it, review it as a team before a single part gets machined.",
  },
  {
    id: "BLD",
    title: "Build",
    body: "Divisions share the machine shop, the electronics bench, and the software stack. Nothing gets built alone.",
  },
  {
    id: "CMP",
    title: "Compete",
    body: "We enter regional and national robotics competitions every season — real deadlines, real judges, real robots.",
  },
  {
    id: "PUB",
    title: "Publish",
    body: "Finished projects go into the public archive: full documentation, source code, and CAD files, open for the next team to build on.",
  },
];

export default function HomePage() {
  return (
    <main>
      <Container style={{ paddingTop: "var(--space-16)", paddingBottom: "var(--space-16)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: "var(--space-12)",
            alignItems: "center",
          }}
        >
          <div>
            <Designator>RASC — EST. STUDENT-RUN ENGINEERING</Designator>
            <h1 style={{ fontSize: 48, marginTop: "var(--space-3)", letterSpacing: "-0.02em" }}>
              We build robots that have to actually work.
            </h1>
            <p
              style={{
                fontSize: 18,
                color: "var(--text-secondary)",
                marginTop: "var(--space-4)",
                maxWidth: 480,
              }}
            >
              Five divisions, one club. From first CAD sketch to competition floor, members ship
              real hardware and software, not class projects.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
              <Button href="/apply">Apply to join</Button>
              <Button href="/projects" variant="secondary">
                View projects
              </Button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CircuitTrace />
          </div>
        </div>
      </Container>

      <Container style={{ paddingBottom: "var(--space-16)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {WHAT_WE_DO.map((item) => (
            <Card key={item.id}>
              <Designator>{item.id}</Designator>
              <h3 style={{ fontSize: 18, marginTop: "var(--space-2)" }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
                {item.body}
              </p>
            </Card>
          ))}
        </div>
      </Container>

      <Container style={{ paddingBottom: "var(--space-16)" }}>
        <Card style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <h2 style={{ fontSize: 28 }}>Applications for the fall term are open.</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
            No prior robotics experience required — every division trains new members.
          </p>
          <div style={{ marginTop: "var(--space-6)" }}>
            <Button href="/apply">Start your application</Button>
          </div>
        </Card>
      </Container>
    </main>
  );
}
