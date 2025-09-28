"use client";

import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import { CORE_QUESTIONS, ProposalResponseSchema, QAKey, Answers } from "@/lib/types/trip";
import { useTripDispatch, useTripState } from "@/components/providers/TripProvider";
import { LocationAutocomplete } from "@/components/onboarding/inputs/LocationAutocomplete";
import { DateRangePicker } from "@/components/onboarding/inputs/DateRangePicker";
import { CountryDropdown } from "@/components/onboarding/inputs/CountryDropdown";
import { CurrencyDropdown } from "@/components/onboarding/inputs/CurrencyDropdown";
import { BudgetSlider } from "@/components/onboarding/inputs/BudgetSlider";
import { TransportationPicker } from "@/components/onboarding/inputs/TransportationPicker";
import { PurposePicker } from "@/components/onboarding/inputs/PurposePicker";
import { FlexibleDatesPicker } from "@/components/onboarding/inputs/FlexibleDatesPicker";


const buildApiUrl = (path: string) => {
  const base = process.env.NEXT_PUBLIC_MASTRA_URL ?? "";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}${path}`;
};



export const OnboardingView = () => {
  const state = useTripState();
  const dispatch = useTripDispatch();

  const currentQuestion = useMemo(() => {
    return CORE_QUESTIONS[state.questionIndex] ?? null;
  }, [state.questionIndex]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    answersOverride?: Answers
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

  const processAnswer = (key: QAKey, input: any) => {
    // Handle different input types from specialized components
    if (key === 'destinations' || key === 'transportation' || key === 'things_to_do' || key === 'food_dietary' || key === 'purpose_of_trip') {
      // These come as arrays from the components
      return Array.isArray(input) ? input : (typeof input === 'string' ? input.split(/,|;|\n/).map(item => item.trim()).filter(Boolean) : []);
    }

    if (key === 'flexible_dates') {
      // This comes as boolean from the component
      return typeof input === 'boolean' ? input : (typeof input === 'string' ? input.toLowerCase().includes('yes') || input.toLowerCase().includes('flexible') : false);
    }

    if (key === 'budget') {
      // This comes as string number from slider
      return typeof input === 'string' ? input : input.toString();
    }

    // For all other fields (strings)
    return typeof input === 'string' ? input.trim() : input.toString();
  };

  const handleContinue = useCallback(async () => {
    if (isLoading || !currentQuestion) return;
    setError(null);

    const activeKey = currentQuestion.id;
    const currentAnswer = state.answers[activeKey];

    // Fields that have acceptable defaults and don't require validation
    const fieldsWithDefaults = ['dates', 'currency', 'budget', 'flexible_dates'];
    // Optional fields that can be skipped
    const optionalFields = ['preferences', 'things_to_do', 'food_dietary'];

    // Validate that we have an answer (skip validation for fields with defaults or optional fields)
    if (!fieldsWithDefaults.includes(activeKey) && !optionalFields.includes(activeKey)) {
      if (!currentAnswer ||
        (Array.isArray(currentAnswer) && currentAnswer.length === 0) ||
        (typeof currentAnswer === 'string' && !currentAnswer.trim())) {
        setError("Please provide an answer before continuing.");
        return;
      }
    }

    const isFinalQuestion = state.questionIndex >= CORE_QUESTIONS.length - 1;
    if (isFinalQuestion) {
      await handleRequestProposal();
    } else {
      dispatch({ type: "ADVANCE_QUESTION" });
    }
  }, [isLoading, currentQuestion, state.answers, dispatch, handleRequestProposal]);

  const handleBack = useCallback(() => {
    if (state.questionIndex > 0) {
      dispatch({ type: "GO_BACK_QUESTION" });
    }
  }, [state.questionIndex, dispatch]);

  const handleAnswerChange = (key: QAKey, value: any) => {
    const processedAnswer = processAnswer(key, value);
    dispatch({ type: "SET_ANSWER", key, value: processedAnswer });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not typing in an input
      if (event.target && (event.target as HTMLElement).tagName === 'INPUT') return;
      if (event.target && (event.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (event.key === 'Enter' && !isLoading) {
        event.preventDefault();
        handleContinue();
      } else if (event.key === 'Escape' && state.questionIndex > 0) {
        event.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, state.questionIndex, handleContinue, handleBack]);

  const renderInputComponent = (question: { id: QAKey; question: string }) => {
    const currentAnswer = state.answers[question.id];

    switch (question.id) {
      case 'destinations':
        return (
          <LocationAutocomplete
            key={`destinations-${state.questionIndex}`}
            value={Array.isArray(currentAnswer) ? currentAnswer : []}
            onChange={(values) => handleAnswerChange(question.id, values)}
            placeholder="Search for cities, countries, or regions..."
            isMulti={true}
            className="w-full"
          />
        );

      case 'starting_point':
        return (
          <LocationAutocomplete
            key={`starting_point-${state.questionIndex}`}
            value={typeof currentAnswer === 'string' && currentAnswer ? [currentAnswer] : []}
            onChange={(values) => handleAnswerChange(question.id, values[0] || "")}
            placeholder="Where are you starting from?"
            isMulti={false}
            className="w-full"
          />
        );

      case 'end_point':
        return (
          <LocationAutocomplete
            key={`end_point-${state.questionIndex}`}
            value={typeof currentAnswer === 'string' && currentAnswer ? [currentAnswer] : []}
            onChange={(values) => handleAnswerChange(question.id, values[0] || "")}
            placeholder="Where do you want to end your trip?"
            isMulti={false}
            className="w-full"
          />
        );

      case 'dates':
        return (
          <DateRangePicker
            value={typeof currentAnswer === 'string' ? currentAnswer : ""}
            onChange={(dateRange) => handleAnswerChange(question.id, dateRange)}
            placeholder="Select your travel dates"
            className="w-full"
          />
        );

      case 'flexible_dates':
        return (
          <FlexibleDatesPicker
            value={typeof currentAnswer === 'boolean' ? currentAnswer : false}
            onChange={(flexible) => handleAnswerChange(question.id, flexible)}
            className="w-full"
          />
        );

      case 'citizenship':
        return (
          <CountryDropdown
            key={`citizenship-${state.questionIndex}`}
            value={typeof currentAnswer === 'string' ? currentAnswer : ""}
            onChange={(country) => handleAnswerChange(question.id, country)}
            placeholder="Select your citizenship"
            className="w-full"
          />
        );

      case 'currency':
        return (
          <CurrencyDropdown
            key={`currency-${state.questionIndex}`}
            value={typeof currentAnswer === 'string' ? currentAnswer : "USD"}
            onChange={(currency) => handleAnswerChange(question.id, currency)}
            placeholder="Select your preferred currency"
            className="w-full"
          />
        );

      case 'budget':
        return (
          <BudgetSlider
            value={typeof currentAnswer === 'string' ? currentAnswer : "2000"}
            onChange={(budget) => handleAnswerChange(question.id, budget)}
            currency={state.answers.currency || "USD"}
            className="w-full"
          />
        );

      case 'transportation':
        return (
          <TransportationPicker
            value={Array.isArray(currentAnswer) ? currentAnswer : []}
            onChange={(transport) => handleAnswerChange(question.id, transport)}
            className="w-full"
          />
        );

      case 'purpose_of_trip':
        return (
          <PurposePicker
            value={Array.isArray(currentAnswer) ? currentAnswer : []}
            onChange={(purposes) => handleAnswerChange(question.id, purposes)}
            className="w-full"
          />
        );

      case 'preferences':
      case 'things_to_do':
      case 'food_dietary':
      default:
        // Fallback to textarea for text-based questions
        return (
          <textarea
            value={Array.isArray(currentAnswer) ? currentAnswer.join(', ') : (typeof currentAnswer === 'string' ? currentAnswer : "")}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer here..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        );
    }
  };

  const handleApprove = () => {
    dispatch({ type: "APPROVE_ITINERARY" });
  };

  const handleRegenerate = async () => {
    await handleRequestProposal();
  };


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

  const prompt = currentQuestion.question;
  const displayIndex = state.questionIndex + 1;

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
            <div className="mt-3 space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Question dots indicator */}
              <div className="flex justify-center space-x-2">
                {CORE_QUESTIONS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full transition-all duration-200 ${index < state.questionIndex
                      ? 'bg-green-500' // Completed
                      : index === state.questionIndex
                        ? 'bg-slate-600 scale-125' // Current
                        : 'bg-slate-300' // Not reached
                      }`}
                  />
                ))}
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col">
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Question {displayIndex} of {CORE_QUESTIONS.length}
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">{prompt}</h2>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

              <div className="mt-8 space-y-6">
                {/* Render the appropriate input component */}
                <div className="space-y-4">
                  {renderInputComponent(currentQuestion)}
                </div>

                {/* Navigation Buttons */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={handleBack}
                      disabled={state.questionIndex === 0}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Back
                    </button>

                    <button
                      onClick={handleContinue}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-8 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Processing..." : (() => {
                        const optionalFields = ['preferences', 'things_to_do', 'food_dietary'];
                        const currentAnswer = state.answers[currentQuestion.id];
                        const hasContent =
                          (typeof currentAnswer === 'string' && currentAnswer.trim().length > 0) ||
                          (Array.isArray(currentAnswer) && currentAnswer.length > 0);

                        if (optionalFields.includes(currentQuestion.id) && !hasContent) {
                          return "Skip";
                        }
                        return "Continue";
                      })()}
                    </button>
                  </div>

                  {/* Keyboard shortcuts hint */}
                  <div className="text-center text-xs text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">Enter</kbd> to {(() => {
                      const optionalFields = ['preferences', 'things_to_do', 'food_dietary'];
                      const currentAnswer = state.answers[currentQuestion.id];
                      const hasContent =
                        (typeof currentAnswer === 'string' && currentAnswer.trim().length > 0) ||
                        (Array.isArray(currentAnswer) && currentAnswer.length > 0);

                      if (optionalFields.includes(currentQuestion.id) && !hasContent) {
                        return "skip";
                      }
                      return "continue";
                    })()}
                    {state.questionIndex > 0 && (
                      <> or <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">Esc</kbd> to go back</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
