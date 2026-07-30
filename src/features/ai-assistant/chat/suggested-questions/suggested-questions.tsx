'use client';

import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { classNames } from '@/util/utils';

import styles from './suggested-questions.module.css';

interface SuggestedQuestionsProps {
  className?: string;
  onClick(prompt: string): void;
  suggestions: string[];
  clearSuggestions(): void;
  isLoading: boolean;
  isRefreshing?: boolean;
}

const SKELETON_COUNT = 3;

export default function SuggestedQuestions({
  className,
  onClick,
  suggestions,
  clearSuggestions,
  isLoading,
  isRefreshing,
}: SuggestedQuestionsProps) {
  const showSkeletons = isLoading && suggestions.length === 0;

  return (
    <div className={classNames(className, styles.suggestedQuestions, styles.container)}>
      {isRefreshing && suggestions.length > 0 && <div className={styles.refreshingOverlay} />}
      <div className={styles.suggestions}>
        {showSkeletons
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className={styles.skeleton} />
            ))
          : suggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isRefreshing}
                className={classNames(isRefreshing && styles.disabled)}
                onClick={() => {
                  onClick(prompt ?? '');
                  clearSuggestions();
                }}
              >
                <ArrowReturnRight />
                <div>{prompt}</div>
              </button>
            ))}
      </div>
    </div>
  );
}
