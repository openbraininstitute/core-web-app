import { ToolInvocationUIPart } from '@ai-sdk/ui-utils';

import ToolPlotGenerator from './tools/tool-plot-generator';
import ToolThumbnailGeneration from './tools/tool-thumbnail-generation-morphology-getone';
import ToolEditState from './tools/tool-editstate';
import { isToolResult } from './tools/types';

import { classNames } from '@/util/utils';

import styles from './tools-components.module.css';

export interface ToolsComponentsProps {
  className?: string;
  part: ToolInvocationUIPart;
  previousState?: unknown | null;
}

export default function ToolsComponents({ className, part, previousState }: ToolsComponentsProps) {
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
      <ToolEditState
        part={part.toolInvocation.toolName === 'editstate' ? part : null}
        previousState={previousState}
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
