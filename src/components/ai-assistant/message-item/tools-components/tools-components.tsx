import { classNames } from '@/util/utils';

import ToolPlotGenerator from './tools/tool-plot-generator';
import ToolThumbnailGeneration from './tools/tool-thumbnail-generation-morphology-getone';
import { isToolResult } from './tools/types';

import type { ToolInvocationUIPart } from '@ai-sdk/ui-utils';

import styles from './tools-components.module.css';

export interface ToolsComponentsProps {
  className?: string;
  part: ToolInvocationUIPart;
}

export default function ToolsComponents({ className, part }: ToolsComponentsProps) {
  return (
    <div className={classNames(className, styles.toolsComponents)}>
      <ToolPlotGenerator
        result={extractToolResults(part, ['run-python', 'plot-generator'], isToolResult)}
      />
      <ToolThumbnailGeneration
        result={extractToolResults(
          part,
          [
            'thumbnail-generation-morphology-getone',
            'thumbnail-generation-electricalcellrecording-getone',
          ],
          isToolResult
        )}
      />
    </div>
  );
}

function extractToolResults<T>(
  part: ToolInvocationUIPart,
  toolsIds: string[],
  typeGuard: (data: unknown) => data is T
): T | null {
  const invocation = part.toolInvocation;

  if (invocation.state !== 'result' || !toolsIds.includes(invocation.toolName)) {
    return null;
  }

  try {
    const result = JSON.parse(invocation.result);
    return typeGuard(result) ? result : null;
  } catch {
    return null;
  }
}
