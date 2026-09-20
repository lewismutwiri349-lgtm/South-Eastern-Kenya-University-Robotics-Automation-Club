"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

interface Question {
  id: string;
  text: string;
  options: string[];
  difficulty: string;
  topic: string;
}

interface TestData {
  test: {
    id: string;
    applicationId: string;
    startedAt: string;
  };
  questions: Question[];
}

const TEST_DURATION_MINUTES = 30;

/**
 * Aptitude test page.
 * Displays questions with a countdown timer.
 */
export default function TestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get("appId");

  const [testData, setTestData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(TEST_DURATION_MINUTES * 60);
  const [submitted, setSubmitted] = useState(false);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Start test on mount
  useEffect(() => {
    if (!appId) {
      setError("Application ID is required");
      return;
    }

    const startTest = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/start-test`, {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || "Failed to start test");
        }

        const data = await res.json();
        setTestData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    startTest();
  }, [appId]);

  // Timer countdown
  useEffect(() => {
    if (!testData || submitted) return;

    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerInterval.current) clearInterval(timerInterval.current);
          // Auto-submit when time runs out
          (async () => {
            if (!testData || !appId || submitted) return;
            setSubmitted(true);
            if (timerInterval.current) clearInterval(timerInterval.current);
            try {
              const answersArray = testData.questions.map((q) => ({
                questionId: q.id,
                answerIndex: answers[q.id] ?? -1,
              }));
              const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/submit-test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ answers: answersArray }),
              });
              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || "Failed to submit test");
              }
              const result = await res.json();
              router.push(`/applicant/status?testResult=${result.data.passed ? "passed" : "failed"}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : "An error occurred");
              setSubmitted(false);
            }
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [testData, submitted, appId, answers, router]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (submitted || !testData) return;
    const question = testData.questions[currentQuestion];
    setAnswers((prev) => ({
      ...prev,
      [question.id]: answerIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!testData || !appId || submitted) return;

    setSubmitted(true);
    if (timerInterval.current) clearInterval(timerInterval.current);

    try {
      const answersArray = testData.questions.map((q) => ({
        questionId: q.id,
        answerIndex: answers[q.id] ?? -1, // -1 for unanswered
      }));

      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/submit-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers: answersArray }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to submit test");
      }

      const result = await res.json();
      router.push(`/applicant/status?testResult=${result.data.passed ? "passed" : "failed"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSubmitted(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Starting your test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!testData) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isWarning = timeRemaining < 300; // < 5 minutes
  const currentQ = testData.questions[currentQuestion];
  const answered = answers[currentQ.id] !== undefined;

  return (
    <div className="fixed inset-0 bg-white z-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Aptitude Test</h1>
          <div className={`text-2xl font-bold font-mono px-4 py-2 rounded ${isWarning ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
            {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-80px)] overflow-y-auto">
        {/* Question Counter */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {testData.questions.length}
            </p>
            <p className="text-xs text-gray-500">Difficulty: {currentQ.difficulty}</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / testData.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <p className="text-lg font-semibold mb-6">{currentQ.text}</p>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <label key={index} className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition" style={{
                borderColor: answers[currentQ.id] === index ? "#2563eb" : "#e5e7eb",
                backgroundColor: answers[currentQ.id] === index ? "#eff6ff" : "transparent",
              }}>
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  checked={answers[currentQ.id] === index}
                  onChange={() => handleAnswerSelect(index)}
                  disabled={submitted}
                  className="mr-3"
                />
                <span className="font-medium">
                  {String.fromCharCode(65 + index)}: {option}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between mb-8">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0 || submitted}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-semibold rounded transition"
          >
            Previous
          </button>

          <div className="text-sm text-gray-600 text-center py-3">
            {answered ? (
              <span className="text-green-600 font-semibold">✓ Answered</span>
            ) : (
              <span className="text-orange-600">○ Not answered</span>
            )}
          </div>

          {currentQuestion < testData.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(Math.min(testData.questions.length - 1, currentQuestion + 1))}
              disabled={submitted}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded transition"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to finish the test?")) {
                  handleSubmit();
                }
              }}
              disabled={submitted}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded transition"
            >
              {submitted ? "Submitting..." : "Finish Test"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
