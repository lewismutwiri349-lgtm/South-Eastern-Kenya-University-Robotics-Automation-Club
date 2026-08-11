import { apiFetch } from "@/lib/api";

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export default async function HomePage() {
  let health: HealthResponse | null = null;
  let error: string | null = null;

  try {
    health = await apiFetch<HealthResponse>("/api/health");
  } catch {
    error = "Backend API is not reachable. Is `npm run dev:backend` running?";
  }

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Robotics Club Platform — Scaffolding</h1>
      <p>This is a placeholder home page confirming the frontend/backend skeleton runs end to end.</p>
      {health && (
        <p style={{ color: "green" }}>
          ✅ Backend reachable: {health.service} — {health.status} ({health.timestamp})
        </p>
      )}
      {error && <p style={{ color: "crimson" }}>❌ {error}</p>}
    </main>
  );
}
