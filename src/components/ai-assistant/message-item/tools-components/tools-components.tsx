import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';

import ToolPlotGenerator from './tools/tool-plot-generator';
import ToolThumbnailGeneration from './tools/tool-thumbnail-generation-morphology-getone';
import { isToolResult } from './tools/types';

import { classNames } from '@/util/utils';

import styles from './tools-components.module.css';

export interface ToolsComponentsProps {
  className?: string;
  message: UIMessage;
}

export default function ToolsComponents({ className, message }: ToolsComponentsProps) {
  return (
    <div className={classNames(className, styles.toolsComponents)}>
      <ToolPlotGenerator results={extractToolsResults(message, ['run-python'], isToolResult)} />
      <ToolThumbnailGeneration
        results={extractToolsResults(
          message,
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

function extractToolsResults<T>(
  message: UIMessage,
  toolsIds: string[],
  typeGuard: (data: unknown) => data is T
): T[] {
  return message.parts
    .filter((part) => part.type === 'tool-invocation')
    .map((part) => part.toolInvocation)
    .filter((invocation) => invocation.state === 'result' && toolsIds.includes(invocation.toolName))
    .map((invocation) => {
      try {
        if (invocation.state !== 'result') return null;

        return JSON.parse(invocation.result);
      } catch {
        return null;
      }
    })
    .filter(typeGuard) as T[];
}
