import { capitalize } from 'es-toolkit/compat';
import React from 'react';

import { AllowedTypes } from '@/features/model-analysis/viewer/asset-viewers/storage';
import { customSorting } from '@/features/model-analysis/viewer/container/hooks/custom-sorting';
import {
  getDocumentation,
  getDocumentationForInputResistance,
  type IValidationDocumentation,
} from '@/features/model-analysis/viewer/container/hooks/dictionary';
import { isNumber } from '@/util/type-guards';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';

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
}

export function useFlatValidationResults(
  validationResults: TValidationResultNonUndefined,
  inputResistanceInMegaOhms: number | undefined,
  entityType: TEntityTypeDict
) {
  console.log('🐞 [index@40] inputResistanceInMegaOhms =', inputResistanceInMegaOhms); // @FIXME: Remove this line written on 2026-06-09 at 10:31
  return React.useMemo(() => {
    const output: FlatValidationResult[] = [];
    for (const result of validationResults) {
      const entityId = result.id;
      for (const asset of result.assets ?? []) {
        const assetId = asset.id;
        const id = `${entityId}/${assetId}`;
        if (isAllowedType(asset.content_type)) {
          // This is a PDF or an image.
          output.push({
            id,
            assetId,
            entityId,
            name: resolveCaption(asset.path),
            passed: result.passed,
            asset: {
              path: asset.path,
              type: asset.content_type,
            },
            documentation: getDocumentation(asset.path, entityType),
          });
        } else if (isInputResistanceSpecialCase(result.name, asset.path)) {
          // Special case of Input Resistance (Rin)
          output.push({
            id,
            assetId,
            entityId,
            name: 'Input Resistance Validation',
            passed: result.passed,
            documentation: getDocumentationForInputResistance(entityType),
            extraVariables: isNumber(inputResistanceInMegaOhms)
              ? {
                  Rin: {
                    value: inputResistanceInMegaOhms.toFixed(2),
                    unit: 'MΩ',
                  },
                }
              : undefined,
          });
        }
      }
    }
    return output.sort(customSorting);
  }, [validationResults, inputResistanceInMegaOhms, entityType]);
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

function isAllowedType(type: string) {
  return (AllowedTypes as unknown as string[]).includes(type);
}

function isInputResistanceSpecialCase(name: string, assetPath: string) {
  if (!name.toLowerCase().includes('input resistance validation')) return false;
  if (!assetPath.toLowerCase().includes('inputresistancevalidation')) return false;
  return true;
}

function filterBySelectedId(selectedId: string) {
  if (selectedId.toLocaleLowerCase() === 'all') return () => true;

  return ({ id }: { id: string }) => id === selectedId;
}

const ACRONYMS = ['AIS', 'BPAP', 'FI', 'IV'];

function resolveCaption(assetPath: string) {
  const prefix = assetPath.split('.')[0];
  return prefix
    .split('_')
    .map((item) => {
      const text = capitalize(item);
      const upperCaseText = text.toUpperCase();
      if (upperCaseText === 'ZOOMED') return '(zoomed)';

      return ACRONYMS.includes(upperCaseText) ? upperCaseText : text;
    })
    .join(' ');
}
