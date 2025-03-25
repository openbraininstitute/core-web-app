'use client';

import React from 'react';

import { useHardcodedSuggestions } from './hardcoded-suggestions';
import { classNames } from '@/util/utils';
import { useServiceAiAgentSuggestionFromUserJourney } from '@/services/ai-agent';

import styles from './suggested-questions.module.css';

export interface SuggestedQuestionsProps {
  className?: string;
  onClick(prompt: string): void;
}

export default function SuggestedQuestions({ className, onClick }: SuggestedQuestionsProps) {
  const [suggestions, clearSuggestions] = useServiceAiAgentSuggestionFromUserJourney();
  const hardcodedSuggestions = useHardcodedSuggestions();

  return (
    <div className={classNames(className, styles.suggestedQuestions)}>
      {[...hardcodedSuggestions, ...suggestions]
        .filter((prompt) => Boolean(prompt))
        .slice(0, 3)
        .map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              onClick(prompt ?? '');
              clearSuggestions();
            }}
          >
            {prompt}
          </button>
        ))}
    </div>
  );
}
