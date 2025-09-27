"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CORE_QUESTIONS, ProposalResponseSchema, QAKey } from "@/lib/types/trip";
import { useTripDispatch, useTripState } from "@/components/providers/TripProvider";
import { ItineraryProposalPreview } from "@/components/onboarding/ItineraryProposalPreview";

interface FollowUpPrompt {
  key: QAKey;
  prompt: string;
}

const buildApiUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_MASTRA_URL ?? "";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}${path}`;
};

const determineFollowUp = (key: QAKey, answer: string): FollowUpPrompt | null => {
  const compact = answer.trim().toLowerCase();
  if (!compact) return null;

  if (key === "dates") {
    const hasRange = /(to|through|until|\-|–)/.test(compact);
    const hasDigits = /\d/.test(compact);
    if (!hasRange || !hasDigits) {
      return {
        key,
        prompt: "Could you also share the trip end date?",
      };
    }
  }

  if (key === "destinations") {
    const parts = compact
      .split(/,|\/|\n|;|and/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      return {
        key,
        prompt: "Would you like to add a second city or confirm it is a single-city trip?",
      };
    }
  }

  if (key === "budget") {
    const numeric = Number(compact.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(numeric) && numeric > 0 && numeric < 800) {
      return {
        key,
        prompt: "Are hostels or budget accommodations acceptable for this trip?",
      };
    }
  }

  return null;
};

const combineAnswer = (current: string, followUpAnswer: string) => {
  if (!current) return followUpAnswer.trim();
  return `${current.trim()} ${followUpAnswer.trim()}`.trim();
};

export const OnboardingView = () => {
  const state = useTripState();
  const dispatch = useTripDispatch();

  const currentQuestion = useMemo(() => {
    return CORE_QUESTIONS[state.questionIndex] ?? null;
  }, [state.questionIndex]);

  const [followUp, setFollowUp] = useState<FollowUpPrompt | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentQuestion || followUp) return;
    setInputValue(state.answers[currentQuestion.id] ?? "");
  }, [currentQuestion, followUp, state.answers]);

  useEffect(() => {
    if (state.proposedItinerary && !state.approvedItinerary) {
      setIsLoading(false);
    }
  }, [state.proposedItinerary, state.approvedItinerary]);

  const progress = useMemo(() => {
    const answered = Math.min(state.answeredKeys.length, CORE_QUESTIONS.length);
    return Math.round((answered / CORE_QUESTIONS.length) * 100);
  }, [state.answeredKeys.length]);

  const handleRequestProposal = async (
    answersOverride?: Record<string, string>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/onboarding/itinerary-proposal"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: answersOverride ?? state.answers }),
      });

      if (!response.ok) {
        throw new Error(`Proposal failed with status ${response.status}`);
      }

      const payload = await response.json();
      const parsed = ProposalResponseSchema.parse(payload);
      dispatch({ type: "SET_PROPOSED_ITINERARY", value: parsed.itinerary });
      if (parsed.generalTasks) {
        dispatch({ type: "SET_GENERAL_TASKS", value: parsed.generalTasks });
      }
      if (parsed.destinationTasks) {
        dispatch({ type: "SET_DESTINATION_TASKS", value: parsed.destinationTasks });
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Sorry, we couldn't generate a proposal. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading || (!currentQuestion && !followUp)) return;

    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setError(null);

    const activeKey = followUp?.key ?? currentQuestion!.id;
    const existingAnswer = state.answers[activeKey] ?? "";

    if (followUp) {
      const combined = combineAnswer(existingAnswer, trimmed);
      dispatch({ type: "SET_ANSWER", key: activeKey, value: combined });
      setFollowUp(null);
      setInputValue("");

      const isFinalQuestion = state.questionIndex >= CORE_QUESTIONS.length - 1;
      if (isFinalQuestion) {
        const override = {
          ...state.answers,
          [activeKey]: combined,
        } as typeof state.answers;
        await handleRequestProposal(override);
      } else {
        dispatch({ type: "ADVANCE_QUESTION" });
      }
      return;
    }

    dispatch({ type: "SET_ANSWER", key: activeKey, value: trimmed });
    const followUpPrompt = determineFollowUp(activeKey, trimmed);
    if (followUpPrompt) {
      setFollowUp(followUpPrompt);
      setInputValue("");
      return;
    }

    const isFinalQuestion = state.questionIndex >= CORE_QUESTIONS.length - 1;
    if (isFinalQuestion) {
      const override = {
        ...state.answers,
        [activeKey]: trimmed,
      } as typeof state.answers;
      await handleRequestProposal(override);
    } else {
      dispatch({ type: "ADVANCE_QUESTION" });
    }
    setInputValue("");
  };

  const handleApprove = () => {
    dispatch({ type: "APPROVE_ITINERARY" });
  };

  const handleRegenerate = async () => {
    await handleRequestProposal();
  };

  if (state.proposedItinerary && !state.approvedItinerary) {
    return (
      <ItineraryProposalPreview
        proposed={state.proposedItinerary}
        onApprove={handleApprove}
        onRegenerate={handleRegenerate}
        isRegenerating={isLoading}
        error={error}
      />
    );
  }

  if (isLoading || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#f6f5f4]">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-12">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
              Generating itinerary
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              Drafting your itinerary…
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Balancing destinations, timing, and preferences. This should only take a moment.
            </p>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-24 animate-pulse rounded-full bg-slate-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const prompt = followUp?.prompt ?? currentQuestion.question;
  const displayIndex = followUp ? state.questionIndex + 1 : state.questionIndex + 1;

  return (
    <div className="min-h-screen bg-[#f6f5f4] px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl gap-10">
        <div className="flex w-full flex-col gap-10">
          <header className="space-y-2">
            <span className="text-sm font-medium uppercase tracking-wide text-slate-400">
              BackpackMate AI
            </span>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Tell us about your trip</h1>
                <p className="text-sm text-slate-500">
                  A few quick questions help the assistant tailor your plan.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                {progress}% complete
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </header>

          <main className="flex flex-1 flex-col">
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Question {displayIndex} of {CORE_QUESTIONS.length}
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">{prompt}</h2>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Share destinations, must-do experiences, budget notes—anything your planner should remember.
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Type your answer here…"
                    rows={3}
                    className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                  >
                    {followUp ? "Submit" : "Continue"}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
