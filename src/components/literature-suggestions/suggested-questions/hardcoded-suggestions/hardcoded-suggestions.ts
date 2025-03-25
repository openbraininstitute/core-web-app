import React from 'react';
import { useSnapshot } from './snapshot';
import { SuggestionsList } from './suggestions-list';
import { isString } from '@/util/type-guards';

export function useHardcodedSuggestions(): string[] {
  const snapshot = useSnapshot();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  React.useEffect(() => {
    const questions = shuffle(SuggestionsList[snapshot?.artifact ?? ''])
      .filter(isNonEmptyString)
      .slice(0, 2)
      .map((question) =>
        question
          .replace('{brain_region}', snapshot?.region ?? 'Midbrain')
          .replace('{human}', 'human')
          .replace('{humans}', 'humans')
          .replace('{rodent}', 'rodent')
          .replace('{rodents}', 'rodents')
          .replace('{rodent/human}', 'rodent')
          .replace('{rodents/humans}', 'rodents')
      );
    setSuggestions(questions);
  }, [snapshot]);
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
