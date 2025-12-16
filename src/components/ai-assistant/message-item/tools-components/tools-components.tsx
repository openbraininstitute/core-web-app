import React from 'react';

import { ToolUIPart } from 'ai';
import ToolPlotGenerator from './tools/tool-plot-generator';
import ToolThumbnailGeneration from './tools/tool-thumbnail-generation-morphology-getone';
import { isToolResult } from './tools/types';

import { classNames } from '@/util/utils';

import styles from './tools-components.module.css';

export interface ToolsComponentsProps {
  className?: string;
  part: ToolUIPart;
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
  part: ToolUIPart,
  toolsIds: string[],
  typeGuard: (data: unknown) => data is T
): T | null {
  const invocation = part;

  if (invocation.state !== 'output-available' || !toolsIds.includes(invocation.type.slice(5))) {
    return null;
  }

  try {
    const result = JSON.parse(invocation.output as string);
    return typeGuard(result) ? result : null;
  } catch {
    return null;
  }
}
