'use client';

import React from 'react';

import { useHardcodedSuggestions } from './hardcoded-suggestions';
import { classNames } from '@/util/utils';
import IconIdea from '@/components/icons/Idea';
import { useServiceAiAgentSuggestionFromUserJourney } from '@/services/ai-agent';

import styles from './suggested-questions.module.css';

interface SuggestedQuestionsProps {
  className?: string;
  /**
   * Suggestions depend on the current chat's thread.
   */
  threadId: string | undefined;
  /**
   * When there is no message yet, we only use 1 generated suggestion and 2 hard-coded ones.
   * Otherwise, we use 3 generated suggestions.
   */
  messagesLength: number;
  onClick(prompt: string): void;
}

export default function SuggestedQuestions({
  className,
  threadId,
  messagesLength,
  onClick,
}: SuggestedQuestionsProps) {
  const [suggestions, clearSuggestions] = useServiceAiAgentSuggestionFromUserJourney(
    threadId ?? '',
    messagesLength === 0 ? 1 : 3
  );
  const hardcodedSuggestions = useHardcodedSuggestions(messagesLength === 0 ? 2 : 0);
  const allSuggestions = [...hardcodedSuggestions, ...suggestions]
    .filter((prompt) => Boolean(prompt))
    .slice(0, 3);

  if (!threadId || allSuggestions.length === 0) return null;

  return (
    <div className={classNames(className, styles.suggestedQuestions)}>
      <div className={styles.title}>
        {messagesLength === 0 ? 'Based on the content you have been browsing' : 'Related'}
      </div>
      <div className={styles.suggestions}>
        {allSuggestions.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              onClick(prompt ?? '');
              clearSuggestions();
            }}
          >
            <IconIdea />
            <div>{prompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
