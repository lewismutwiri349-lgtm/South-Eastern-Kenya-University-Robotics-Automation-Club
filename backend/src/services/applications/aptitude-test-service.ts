import { generateId } from "../../lib/id-generator";
import { updateApplicationStatus } from "./applications-service";

/**
 * Aptitude test business logic.
 * Manages test instances, question randomization, answer validation, and scoring.
 */

const PASS_THRESHOLD = 60; // 60%
const MAX_RETRIES = 3;
const TEST_DURATION_MINUTES = 30;
const QUESTIONS_PER_TEST = 20;

export interface TestInstance {
  id: string;
  applicationId: string;
  score: number | null;
  passed: boolean | null;
  startedAt: Date;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestQuestion {
  id: string;
  text: string;
  options: string[]; // JSON parsed array ["A", "B", "C", "D"]
  correctAnswerIndex: number;
  difficulty: string;
  topic: string;
  createdAt: Date;
}

export interface TestResult {
  testId: string;
  applicationId: string;
  score: number;
  passed: boolean;
  submittedAt: Date;
}

/**
 * Start a new aptitude test for an applicant.
 * Randomly selects 20 questions from the question bank.
 * Returns test instance and randomized questions (without correct answers).
 */
export async function startTest(
  database: D1Database,
  applicationId: string
): Promise<{ test: TestInstance; questions: Array<Omit<TestQuestion, "correctAnswerIndex">> }> {
  // Check if applicant has already passed the test
  const passedTest = await database
    .prepare(
      `
      SELECT id FROM aptitude_tests
      WHERE application_id = ? AND passed = 1
      LIMIT 1
    `
    )
    .bind(applicationId)
    .first<{ id: string }>();

  if (passedTest) {
    throw new Error("Applicant has already passed the test");
  }

  // Check retry count
  const attemptCount = await database
    .prepare(`SELECT COUNT(*) as count FROM aptitude_tests WHERE application_id = ?`)
    .bind(applicationId)
    .first<{ count: number }>();

  if (attemptCount && attemptCount.count >= MAX_RETRIES) {
    throw new Error("Maximum test attempts exceeded");
  }

  // Get 20 random questions
  const questionsResult = await database
    .prepare(
      `
      SELECT id, text, options, correct_answer_index, difficulty, topic, created_at
      FROM test_questions
      ORDER BY RANDOM()
      LIMIT ?
    `
    )
    .bind(QUESTIONS_PER_TEST)
    .all<TestQuestion>();

  const questions = questionsResult.results || [];

  if (!questions || questions.length < QUESTIONS_PER_TEST) {
    throw new Error("Insufficient questions in question bank");
  }

  // Create test instance
  const now = new Date();
  const testId = generateId();
  const test = await database
    .prepare(
      `
      INSERT INTO aptitude_tests (
        id, application_id, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `
    )
    .bind(testId, applicationId, Math.floor(now.getTime() / 1000), Math.floor(now.getTime() / 1000), Math.floor(now.getTime() / 1000))
    .first<TestInstance>();

  if (!test) throw new Error("Failed to create test instance");

  // Return questions without correct answers
  const questionsForClient = questions.map(({ correctAnswerIndex, ...q }: any) => q);

  return { test, questions: questionsForClient };
}

/**
 * Submit test answers and calculate score.
 * Enforces time limit (30 minutes).
 */
export async function submitTest(
  database: D1Database,
  testId: string,
  applicationId: string,
  answers: Array<{ questionId: string; answerIndex: number }>
): Promise<TestResult> {
  const now = new Date();

  // Fetch the test instance
  const test = await database
    .prepare(`SELECT * FROM aptitude_tests WHERE id = ? AND application_id = ?`)
    .bind(testId, applicationId)
    .first<TestInstance>();

  if (!test) throw new Error("Test not found");
  if (test.submittedAt) throw new Error("Test already submitted");

  // Check time limit (30 minutes)
  const elapsedMinutes = (now.getTime() - test.startedAt.getTime()) / (1000 * 60);
  if (elapsedMinutes > TEST_DURATION_MINUTES) {
    throw new Error("Test time limit exceeded");
  }

  // Store answers
  for (const answer of answers) {
    await database
      .prepare(
        `
        INSERT INTO test_answers (id, test_id, question_id, answer_index, created_at)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .bind(
        generateId(),
        testId,
        answer.questionId,
        answer.answerIndex,
        Math.floor(now.getTime() / 1000)
      )
      .run();
  }

  // Calculate score
  const score = await calculateScore(database, testId, answers);
  const passed = score >= PASS_THRESHOLD;

  // Update test record
  await database
    .prepare(
      `
      UPDATE aptitude_tests
      SET score = ?, passed = ?, submitted_at = ?, updated_at = ?
      WHERE id = ?
    `
    )
    .bind(score, passed ? 1 : 0, Math.floor(now.getTime() / 1000), Math.floor(now.getTime() / 1000), testId)
    .run();

  // Update application status
  if (passed) {
    await updateApplicationStatus(database, applicationId, "test_passed");
  } else if (await isMaxRetriesExceeded(database, applicationId)) {
    await updateApplicationStatus(database, applicationId, "test_failed");
  } else {
    await updateApplicationStatus(database, applicationId, "testing");
  }

  return {
    testId,
    applicationId,
    score,
    passed,
    submittedAt: now,
  };
}

/**
 * Calculate the percentage score for a test.
 */
async function calculateScore(
  database: D1Database,
  testId: string,
  answers: Array<{ questionId: string; answerIndex: number }>
): Promise<number> {
  // Fetch correct answers for all questions in this test
  const resultSet = await database
    .prepare(
      `
      SELECT tq.id as question_id, tq.correct_answer_index
      FROM test_answers ta
      JOIN test_questions tq ON ta.question_id = tq.id
      WHERE ta.test_id = ?
      LIMIT ?
    `
    )
    .bind(testId, QUESTIONS_PER_TEST)
    .all<{ question_id: string; correct_answer_index: number }>();

  const correctAnswers = resultSet.results || [];

  if (!correctAnswers || correctAnswers.length === 0) {
    throw new Error("Could not fetch correct answers");
  }

  // Create a map of correct answers
  const correctMap = new Map(
    correctAnswers.map((a) => [a.question_id, a.correct_answer_index])
  );

  // Count correct answers
  let correct = 0;
  for (const answer of answers) {
    if (correctMap.get(answer.questionId) === answer.answerIndex) {
      correct++;
    }
  }

  return Math.round((correct / answers.length) * 100);
}

/**
 * Check if maximum retry attempts have been exceeded.
 */
async function isMaxRetriesExceeded(database: D1Database, applicationId: string): Promise<boolean> {
  const count = await database
    .prepare(`SELECT COUNT(*) as count FROM aptitude_tests WHERE application_id = ?`)
    .bind(applicationId)
    .first<{ count: number }>();

  return count ? count.count >= MAX_RETRIES : false;
}

/**
 * Get test result for an applicant.
 */
export async function getTestResult(
  database: D1Database,
  applicationId: string
): Promise<TestResult | null> {
  const test = await database
    .prepare(
      `
      SELECT id, application_id, score, passed, submitted_at
      FROM aptitude_tests
      WHERE application_id = ? AND submitted_at IS NOT NULL
      ORDER BY submitted_at DESC
      LIMIT 1
    `
    )
    .bind(applicationId)
    .first<{
      id: string;
      application_id: string;
      score: number;
      passed: boolean;
      submitted_at: Date;
    }>();

  if (!test) return null;

  return {
    testId: test.id,
    applicationId: test.application_id,
    score: test.score,
    passed: test.passed,
    submittedAt: test.submitted_at,
  };
}
