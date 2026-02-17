import { useState } from 'react';

import { useFlatValidationResults, useSelectedValidationResults } from './hooks';
import { SelectAnalysis } from './select-analysis';
import { ValidationExplanation } from './validation-explanation';
import { ValidationResultCard } from './validation-result-card';

import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';

type Props = {
  rin: number | undefined;
  validationResults: TValidationResultNonUndefined;
};

export function ViewerContainer({ rin, validationResults }: Props) {
  const [selectedId, setSelectedId] = useState<string>('all');
  const flatValidationResults = useFlatValidationResults(validationResults, rin);
  const selectedValidationResults = useSelectedValidationResults(flatValidationResults, selectedId);
  if (flatValidationResults.length === 0) return <div>No validation results found</div>;

  const passed = flatValidationResults.reduce(
    (accumulator, item) => accumulator && item.passed,
    true
  );

  return (
    <>
      <ValidationExplanation passed={passed} />
      <SelectAnalysis value={selectedId} onChange={setSelectedId} results={flatValidationResults} />
      {selectedValidationResults.map((result) => (
        <ValidationResultCard key={result.id} value={result} />
      ))}
    </>
  );
}
