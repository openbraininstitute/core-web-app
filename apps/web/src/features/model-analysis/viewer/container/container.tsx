import { useState } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import {
  useFlatValidationResults,
  useSelectedValidationResults,
} from '@/features/model-analysis/viewer/container/hooks';
import { SelectAnalysis } from '@/features/model-analysis/viewer/container/select-analysis/select-analysis';
import { ValidationExplanation } from '@/features/model-analysis/viewer/container/validation-explanation';
import { ValidationResultCard } from '@/features/model-analysis/viewer/container/validation-explanation/card';
import { detailViewValueClass } from '@/ui/segments/detail-view/variant-styles';

import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';

type Props = {
  rin: number | undefined;
  validationResults: TValidationResultNonUndefined;
  entity: TRetrieveEntityOutput;
  variant?: TViewVariant;
};

export function ViewerContainer({
  rin,
  validationResults,
  entity,
  variant = ViewVariant.Light,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>('all');
  const flatValidationResults = useFlatValidationResults(validationResults, rin, entity.type);
  const selectedValidationResults = useSelectedValidationResults(flatValidationResults, selectedId);

  if (flatValidationResults.length === 0) {
    return <div className={detailViewValueClass(variant)}>No validation results found</div>;
  }

  const passed = flatValidationResults.reduce(
    (accumulator, item) => accumulator && item.passed,
    true
  );

  return (
    <>
      <ValidationExplanation passed={passed} entity={entity} variant={variant} />
      <SelectAnalysis
        value={selectedId}
        onChange={setSelectedId}
        results={flatValidationResults}
        variant={variant}
      />
      {selectedValidationResults.map((result) => (
        <ValidationResultCard key={result.id} value={result} variant={variant} />
      ))}
    </>
  );
}
