import { useState } from 'react';
import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';
import { useFlatValidationResults, useSelectedValidationResults } from './hooks';
import { SelectAnalysis } from './select-analysis';
import { ValidationExplanation } from './validation-explanation';
import { ValidationResultCard } from './validation-result-card';

type Props = {
  rin: number | undefined;
  validationResults: TValidationResultNonUndefined;
};

export function ViewerContainer({ rin, validationResults }: Props) {
  const [selected, setSelected] = useState<string>('all');
  const flatValidationResults = useFlatValidationResults(validationResults, rin);
  const selectedValidationResults = useSelectedValidationResults(flatValidationResults, selected);
  if (flatValidationResults.length === 0) return <div>No validation results found</div>;

  const passed = flatValidationResults.reduce(
    (accumulator, item) => accumulator && item.passed,
    true,
  );

  return (
    <>
      <ValidationExplanation passed={passed} />
      <SelectAnalysis value={selected} onChange={setSelected} results={flatValidationResults} />
      {selectedValidationResults.map((result) => (
        <ValidationResultCard key={result.id} value={result} />
      ))}
    </>
  );
}
