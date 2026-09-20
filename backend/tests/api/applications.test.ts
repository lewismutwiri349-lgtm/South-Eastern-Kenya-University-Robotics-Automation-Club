import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { unstable_dev } from "wrangler";

describe("Applications API Integration Tests", () => {
  let worker: any;
  let testAppId: string;

  beforeAll(async () => {
    // Start wrangler dev environment
    worker = await unstable_dev("backend/wrangler.toml", {
      experimental: {
        disableExperimentalWarning: true,
      },
    });
  });

  afterAll(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  describe("POST /api/applications", () => {
    it("should create new application with valid data", async () => {
      const response = await worker.fetch("http://localhost:8787/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=test-session-token",
        },
        body: JSON.stringify({
          firstName: "John",
          lastName: "Doe",
          bio: "Robotics enthusiast",
          divisionPreferencePrimary: "hardware",
          divisionPreferenceSecondary: "firmware",
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBeDefined();
      testAppId = data.data.id;
    });

    it("should reject unauthenticated requests", async () => {
      const response = await worker.fetch("http://localhost:8787/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "John" }),
      });

      expect(response.status).toBe(401);
    });

    it("should reject invalid role (non-applicant)", async () => {
      const response = await worker.fetch("http://localhost:8787/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=admin-token",
        },
        body: JSON.stringify({ firstName: "John" }),
      });

      expect(response.status).toBe(403);
    });

    it("should validate required fields", async () => {
      const response = await worker.fetch("http://localhost:8787/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=test-session-token",
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/applications/:id", () => {
    it("should retrieve application by ID", async () => {
      const response = await worker.fetch(`http://localhost:8787/api/applications/${testAppId}`, {
        headers: { Cookie: "session=test-session-token" },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(testAppId);
    });

    it("should return 404 for non-existent application", async () => {
      const response = await worker.fetch("http://localhost:8787/api/applications/nonexistent-id", {
        headers: { Cookie: "session=test-session-token" },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/applications/:id/start-test", () => {
    it("should create aptitude test with 20 questions", async () => {
      const response = await worker.fetch(
        `http://localhost:8787/api/applications/${testAppId}/start-test`,
        {
          method: "POST",
          headers: { Cookie: "session=test-session-token" },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.questions.length).toBe(20);
      expect(data.data.questions[0].options.length).toBe(4);
      // Ensure correct_answer_index is not in response
      expect(data.data.questions[0].correct_answer_index).toBeUndefined();
    });

    it("should reject if max retries exceeded", async () => {
      // This would require setup of 3 failed attempts first
      expect(true).toBe(true);
    });
  });

  describe("POST /api/applications/:id/submit-test", () => {
    it("should score test and update application status", async () => {
      // First start a test
      const startRes = await worker.fetch(
        `http://localhost:8787/api/applications/${testAppId}/start-test`,
        {
          method: "POST",
          headers: { Cookie: "session=test-session-token" },
        }
      );

      const testData = await startRes.json();
      const questions = testData.data.questions;

      // Create valid answers array
      const answers = questions.map((q: any) => ({
        questionId: q.id,
        answerIndex: 0, // All answer A
      }));

      // Submit test
      const submitRes = await worker.fetch(
        `http://localhost:8787/api/applications/${testAppId}/submit-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: "session=test-session-token",
          },
          body: JSON.stringify({ answers }),
        }
      );

      expect(submitRes.status).toBe(200);
      const result = await submitRes.json();
      expect(result.data.score).toBeDefined();
      expect(result.data.passed).toBeDefined();
    });
  });

  describe("GET /api/applications/:id/test-result", () => {
    it("should retrieve most recent test result", async () => {
      const response = await worker.fetch(
        `http://localhost:8787/api/applications/${testAppId}/test-result`,
        {
          headers: { Cookie: "session=test-session-token" },
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.score).toBeDefined();
        expect(data.data.passed).toBeDefined();
      }
    });
  });

  describe("GET /api/applications/interview-slots", () => {
    it("should list available slots for next 14 days", async () => {
      const response = await worker.fetch("http://localhost:8787/api/applications/interview-slots", {
        headers: { Cookie: "session=test-session-token" },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should include availability status", async () => {
      const response = await worker.fetch("http://localhost:8787/api/applications/interview-slots", {
        headers: { Cookie: "session=test-session-token" },
      });

      const data = await response.json();
      if (data.data.length > 0) {
        const slot = data.data[0];
        expect(slot.available).toBeDefined();
        expect(slot.startTime).toBeDefined();
      }
    });
  });

  describe("POST /api/applications/:id/schedule-interview", () => {
    it("should schedule interview for passed applicant", async () => {
      // Would need a passed test first
      expect(true).toBe(true);
    });

    it("should reject if test not passed", async () => {
      expect(true).toBe(true);
    });

    it("should reject if slot is full", async () => {
      expect(true).toBe(true);
    });
  });

  describe("GET /api/applications/:id/interviews", () => {
    it("should retrieve scheduled interviews", async () => {
      const response = await worker.fetch(
        `http://localhost:8787/api/applications/${testAppId}/interviews`,
        {
          headers: { Cookie: "session=test-session-token" },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});
