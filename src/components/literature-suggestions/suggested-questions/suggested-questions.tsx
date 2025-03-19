'use client';

import React from 'react';

import { classNames } from '@/util/utils';
import { useServiceAiAgentSuggestionFromUserJourney } from '@/services/ai-agent';

import styles from './suggested-questions.module.css';

export interface SuggestedQuestionsProps {
  className?: string;
  onClick(prompt: string): void;
}

export default function SuggestedQuestions({ className, onClick }: SuggestedQuestionsProps) {
  const [suggestions, clearSuggestions] = useServiceAiAgentSuggestionFromUserJourney();
  const extraSuggestions = useExtraSuggestions();

  return (
    <div className={classNames(className, styles.suggestedQuestions)}>
      {[...suggestions, ...extraSuggestions]
        .filter((prompt) => Boolean(prompt))
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

function useExtraSuggestions(): string[] {
  const [suggestions] = React.useState<string[]>([]);
  return suggestions;
}
