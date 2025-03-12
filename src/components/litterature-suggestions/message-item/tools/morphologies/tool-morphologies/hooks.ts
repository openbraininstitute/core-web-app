import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';
import { extractTool, uniquify } from '../../common';
import { isGetMorphoToolResult, Morphology } from './types';

export function useMorphologies(message: UIMessage): Morphology[] {
  return React.useMemo(() => {
    const morphologies: Morphology[] = [];
    for (const { output: data } of extractTool(message, 'get-morpho-tool')) {
      if (!isGetMorphoToolResult(data)) continue;

      for (const item of data) {
        morphologies.push({
          id: item.morphology_id,
          name: item.morphology_name,
          description: item.morphology_description,
        });
      }
    }
    return uniquify(morphologies, (m) => m.id);
  }, [message]);
}
