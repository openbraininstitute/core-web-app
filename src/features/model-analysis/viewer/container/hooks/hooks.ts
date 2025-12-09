import { capitalize } from 'es-toolkit/compat';
import React from 'react';

import { TValidationResultNonUndefined } from '../../../explorer/use-analysis';
import { AllowedTypes } from '../../asset-viewers/storage';
import { customSorting } from './custom-sorting';
import { getDocumentation, getDocumentationForInputResistance } from './dictionary';

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
  documentation?: {
    description: string;
    protocol: {
      type: string;
      delay: string;
      duration: string;
      amplitude: string;
      totalDuration: string;
    };
    validation_condition: string;
  };
}

export function useFlatValidationResults(
  validationResults: TValidationResultNonUndefined,
  rin: number | undefined
) {
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
            documentation: getDocumentation(asset.path),
          });
        } else if (isInputResistanceSpecialCase(result.name, asset.path)) {
          // Special case of Input Resistance (Rin)
          output.push({
            id,
            assetId,
            entityId,
            name: 'Input Resistance Validation',
            passed: result.passed,
            documentation: getDocumentationForInputResistance(),
            extraVariables: rin
              ? {
                  Rin: {
                    value: rin.toFixed(2),
                    unit: 'MΩ',
                  },
                }
              : undefined,
          });
        }
      }
    }
    return output.sort(customSorting);
  }, [validationResults, rin]);
}

export function useSelectedValidationResults(
  flatValidationResults: FlatValidationResult[],
  selectedName: string
) {
  return React.useMemo(
    () => flatValidationResults.filter(filterBySelectedName(selectedName)),
    [flatValidationResults, selectedName]
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

function filterBySelectedName(selectedName: string) {
  if (selectedName.toLocaleLowerCase() === 'all') return () => true;

  return ({ name }: { name: string }) => name === selectedName;
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
