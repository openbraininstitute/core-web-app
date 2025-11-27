import React from 'react';
import { ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { extractTool, uniquify } from '../../common';
import { isGetMorphoToolResult, Morphology } from './types';

export function useMorphologies(part: ToolInvocationUIPart): Morphology[] {
  return React.useMemo(() => {
    const morphologies: Morphology[] = [];
    const data = extractTool(part, 'get-morpho-tool');
    if (data === null) return [];
    if (!isGetMorphoToolResult(data)) return [];

    for (const item of data) {
      morphologies.push({
        id: item.morphology_id,
        name: item.morphology_name,
        description: item.morphology_description,
      });
    }
    return uniquify(morphologies, (m) => m.id);
  }, [part]);
}
