import React from 'react';

import { flattenValidationResults } from '@/features/model-analysis/helpers';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';
import type { IValidationDocumentation } from '@/features/model-analysis/viewer/container/hooks/dictionary';

export interface FlatValidationResult {
  id: string;
  assetId: string;
  entityId: string;
  name: string;
  passed: boolean;
  asset?: {
    path: string;
    type: string;
  };
  extraVariables?: Record<
    string,
    {
      value: string;
      unit: string;
    }
  >;
  documentation?: IValidationDocumentation;
  resultDescription?: string;
}

export function useFlatValidationResults(
  validationResults: TValidationResultNonUndefined,
  inputResistanceInMegaOhms: number | undefined,
  entityType: TEntityTypeDict
) {
  return React.useMemo(
    () => flattenValidationResults(validationResults, inputResistanceInMegaOhms, entityType),
    [validationResults, inputResistanceInMegaOhms, entityType]
  );
}

export function useSelectedValidationResults(
  flatValidationResults: FlatValidationResult[],
  selectedId: string
) {
  return React.useMemo(
    () => flatValidationResults.filter(filterBySelectedId(selectedId)),
    [flatValidationResults, selectedId]
  );
}

function filterBySelectedId(selectedId: string) {
  if (selectedId.toLocaleLowerCase() === 'all') return () => true;

  return ({ id }: { id: string }) => id === selectedId;
}
