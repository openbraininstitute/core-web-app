'use client';

import React from 'react';

import { usePromptSuggestions } from '../hooks';
import { classNames } from '@/util/utils';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useGenericEventListener } from '@/util/generic-event';

import styles from './suggested-questions.module.css';

export interface SuggestedQuestionsProps {
  className?: string;
  onClick(prompt: string): void;
}

export default function SuggestedQuestions({ className, onClick }: SuggestedQuestionsProps) {
  const [suggestions, clearSuggestions] = usePromptSuggestions();
  const extraSuggestion = useMophologySuggestion();

  return (
    <div className={classNames(className, styles.suggestedQuestions)}>
      {[...suggestions, extraSuggestion]
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

function useMophologySuggestion(): string | null {
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const fetchSuggestion = React.useCallback(() => {
    const action = async () => {
      let brainRegion = 'Cerebrum';
      const journey = await userJourneyTracker.getLastTuples();
      for (const group of journey) {
        for (const [type, value] of group) {
          if (type === 'brain_region') brainRegion = value;
        }
      }
      brainRegion = 'Cerebrum';
      setSuggestion(`Show me one morphology from this region: ${brainRegion}`);
    };
    action();
  }, []);
  React.useEffect(fetchSuggestion, [fetchSuggestion]);
  useGenericEventListener(userJourneyTracker.eventChange, fetchSuggestion);
  return suggestion;
}
