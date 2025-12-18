'use client';

import React from 'react';

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
   * Backend always returns 3 suggestions.
   */
  messagesLength: number;
  onClick(prompt: string): void;
  isLoading?: boolean;
}

export default function SuggestedQuestions({
  className,
  threadId,
  messagesLength,
  onClick,
  isLoading,
}: SuggestedQuestionsProps) {
  const [allSuggestions, clearSuggestions, isLoadingFromHook] = useServiceAiAgentSuggestionFromUserJourney(
    threadId ?? ''
  );
  const actualLoading = isLoading ?? isLoadingFromHook;
  
  if (!threadId) return null;
  if (allSuggestions.length === 0 && !actualLoading) return null;

  return (
    <div className={classNames(className, styles.suggestedQuestions, styles.container)}>
      <div className={styles.title}>
        {messagesLength === 0 ? 'Based on the content you have been browsing' : 'Related'}
      </div>
      {allSuggestions.length === 0 && actualLoading ? (
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner} />
        </div>
      ) : (
        <>
          <div className={classNames(styles.suggestions, actualLoading && styles.loading)}>
            {allSuggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  onClick(prompt ?? '');
                  clearSuggestions();
                }}
                disabled={actualLoading}
              >
                <IconIdea />
                <div>{prompt}</div>
              </button>
            ))}
          </div>
          {actualLoading && (
            <div className={styles.spinnerOverlay}>
              <div className={styles.spinner} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
