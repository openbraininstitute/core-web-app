'use client';

import ArrowRightIcon from '@/components/icons/ArrowRightIcon';
import { classNames } from '@/util/utils';

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
  suggestions: string[];
  clearSuggestions(): void;
  isLoading: boolean;
}

export default function SuggestedQuestions({
  className,
  threadId,
  messagesLength,
  onClick,
  suggestions,
  clearSuggestions,
  isLoading,
}: SuggestedQuestionsProps) {
  if (!threadId) return null;
  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div className={classNames(className, styles.suggestedQuestions, styles.container)}>
      <div className={styles.title}>
        {messagesLength === 0 ? 'Based on the content you have been browsing' : 'Related'}
      </div>
      {isLoading ? (
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner} />
        </div>
      ) : (
        <>
          <div className={classNames(styles.suggestions, isLoading && styles.loading)}>
            {suggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  onClick(prompt ?? '');
                  clearSuggestions();
                }}
                disabled={isLoading}
              >
                <ArrowRightIcon />
                <div>{prompt}</div>
              </button>
            ))}
          </div>
          {isLoading && (
            <div className={styles.spinnerOverlay}>
              <div className={styles.spinner} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
