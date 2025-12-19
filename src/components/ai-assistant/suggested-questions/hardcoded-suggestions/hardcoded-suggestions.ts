import React from 'react';
import { isString } from '@/util/type-guards';
import { useSnapshot } from './snapshot';
import { SuggestionsListFullBrain, SuggestionsListPerRegion } from './suggestions-list';

export function useHardcodedSuggestions(maxNumberOfQuestions: number = 2): string[] {
  const snapshot = useSnapshot();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  React.useEffect(() => {
    const artifact = snapshot.artifact ?? '';
    const list = snapshot.isRootRegion ? SuggestionsListFullBrain : SuggestionsListPerRegion;
    const questions = shuffle(list[artifact])
      .filter(isNonEmptyString)
      .slice(0, maxNumberOfQuestions)
      .map((question) =>
        question
          .replace('{brain_region}', snapshot.regionTitle || 'Midbrain')
          .replace('{human}', 'human')
          .replace('{humans}', 'humans')
          .replace('{rodent}', 'rodent')
          .replace('{rodents}', 'rodents')
          .replace('{rodent/human}', 'rodent')
          .replace('{rodents/humans}', 'rodents'),
      );
    setSuggestions(questions);
  }, [maxNumberOfQuestions, snapshot]);

  return suggestions;
}

function shuffle<T>(arr: T[] | undefined): T[] {
  if (!arr) return [];

  const clone = [...arr];
  for (let i = 0; i < clone.length; i++) {
    const k = Math.round(Math.random() * clone.length);
    const tmp = clone[i];
    clone[i] = clone[k];
    clone[k] = tmp;
  }
  return clone;
}

function isNonEmptyString(s: unknown) {
  return isString(s) && s.trim().length > 0;
}
