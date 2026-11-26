import { capitalize } from 'es-toolkit/compat';

import { AllowedTypes } from '@/features/model-analysis/viewer/asset-viewers/storage';
import { customSorting } from '@/features/model-analysis/viewer/container/hooks/custom-sorting';
import {
  getDocumentation,
  getDocumentationForInputResistance,
} from '@/features/model-analysis/viewer/container/hooks/dictionary';
import { isNumber } from '@/util/type-guards';
import { normalizeString } from '@/util/utils';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';
import type { FlatValidationResult } from '@/features/model-analysis/viewer/container/hooks';

const ValidationResultName = { Thumbnail: 'thumbnail' } as const;

export function isThumbnailResult({ name }: { name: string }) {
  return normalizeString(name) === ValidationResultName.Thumbnail;
}

export function flattenValidationResults(
  validationResults: TValidationResultNonUndefined,
  inputResistanceInMegaOhms: number | undefined,
  entityType: TEntityTypeDict
): FlatValidationResult[] {
  const output: FlatValidationResult[] = [];
  for (const result of validationResults) {
    const entityId = result.id;
    const resultDescription = result.description?.trim() || undefined;
    for (const asset of result.assets ?? []) {
      const assetId = asset.id;
      const id = `${entityId}/${assetId}`;
      if (isAllowedType(asset.content_type)) {
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
          resultDescription,
        });
      } else if (isInputResistanceSpecialCase(result.name, asset.path)) {
        output.push({
          id,
          assetId,
          entityId,
          name: 'Input Resistance Validation',
          passed: result.passed,
          documentation: getDocumentationForInputResistance(entityType),
          resultDescription,
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
}

function isAllowedType(type: string) {
  return (AllowedTypes as unknown as string[]).includes(type);
}

function isInputResistanceSpecialCase(name: string, assetPath: string) {
  if (!name.toLowerCase().includes('input resistance validation')) return false;
  if (!assetPath.toLowerCase().includes('inputresistancevalidation')) return false;
  return true;
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
