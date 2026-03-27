'use client';

import { ArrowReturnRight } from '@/components/icons/ArrowReturnRight';
import { classNames } from '@/util/utils';

import styles from './suggested-questions.module.css';

interface SuggestedQuestionsProps {
  className?: string;
  /**
   * Suggestions depend on the current chat's thread.
   */
  threadId: string | undefined;
  onClick(prompt: string): void;
  suggestions: string[];
  clearSuggestions(): void;
  isLoading: boolean;
}

const SKELETON_COUNT = 3;

export default function SuggestedQuestions({
  className,
  threadId,
  onClick,
  suggestions,
  clearSuggestions,
  isLoading,
}: SuggestedQuestionsProps) {
  const showSkeletons = isLoading || suggestions.length === 0;

  return (
    <div className={classNames(className, styles.suggestedQuestions, styles.container)}>
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
