import React from 'react';

import { classNames } from '@/util/utils';

import { isToolResult, PlotInChat } from '../storage-plots';

import type { ToolInvocationUIPart, UIMessage } from '@ai-sdk/ui-utils';

import styles from './backup-plots.module.css';

export interface BackupPlotsProps {
  className?: string;
  part: ToolInvocationUIPart;
  lastTextPart?: string;
}

export interface BackupPlotsWrapperProps {
  message: UIMessage;
  isLastMessage: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
}

export function BackupPlotsWrapper({ message, isLastMessage, status }: BackupPlotsWrapperProps) {
  const deferredParts = React.useDeferredValue(message.parts);

  const backupPlotsData =
    !isLastMessage || status === 'ready'
      ? deferredParts.filter((part) => part.type === 'tool-invocation')
      : [];

  const textParts = deferredParts.filter((p) => p.type === 'text');
  const lastTextPart = textParts.length > 0 ? textParts[textParts.length - 1].text : undefined;

  const plotsWithContent: React.ReactNode[] = [];

  backupPlotsData.forEach((part) => {
    const result = extractToolResults(
      part as ToolInvocationUIPart,
      [
        'run-python',
        'thumbnail-generation-morphology-getone',
        'thumbnail-generation-electricalcellrecording-getone',
      ],
      isToolResult
    );

    if (!result) return;

    const fileIdentifier = result.image_link ?? result.url_link ?? result.storage_id;
    if (!fileIdentifier) return;

    const urlLinks = Array.isArray(fileIdentifier) ? fileIdentifier : [fileIdentifier];
    const urlLinksWithoutImageLink = urlLinks.filter((urlLink) => {
      const storageIdMatch = urlLink.match(/\/storage\/([^/]+)/);
      const storageId = storageIdMatch ? storageIdMatch[1] : urlLink;
      return !lastTextPart?.match(new RegExp(`!\\[.*?\\]\\([^)]*\\/storage\\/${storageId}\\)`));
    });

    if (urlLinksWithoutImageLink.length > 0) {
      plotsWithContent.push(
        <BackupPlots
          key={(part as any).toolInvocation.toolCallId}
          part={part as ToolInvocationUIPart}
          lastTextPart={lastTextPart}
        />
      );
    }
  });

  if (plotsWithContent.length === 0) return null;

  return (
    <div className="mt-4 pt-2 border-t-2 border-dotted border-gray-300">
      <p className="text-sm text-gray-500 mb-2">Some plots were not embedded in the chat</p>
      {plotsWithContent}
    </div>
  );
}

export default function BackupPlots({ className, part, lastTextPart }: BackupPlotsProps) {
  const result = extractToolResults(
    part,
    [
      'run-python',
      'thumbnail-generation-morphology-getone',
      'thumbnail-generation-electricalcellrecording-getone',
    ],
    isToolResult
  );

  if (!result) return null;

  const fileIdentifier = result.image_link ?? result.url_link ?? result.storage_id;
  if (!fileIdentifier) return null;

  const urlLinks = Array.isArray(fileIdentifier) ? fileIdentifier : [fileIdentifier];

  const urlLinksWithoutImageLink = urlLinks.filter((urlLink) => {
    const storageIdMatch = urlLink.match(/\/storage\/([^/]+)/);
    const storageId = storageIdMatch ? storageIdMatch[1] : urlLink;

    return !lastTextPart?.match(new RegExp(`!\\[.*?\\]\\([^)]*\\/storage\\/${storageId}\\)`));
  });

  if (urlLinksWithoutImageLink.length === 0) {
    return null;
  }

  return (
    <div className={classNames(className, styles.backupPlots)}>
      {urlLinksWithoutImageLink.map((urlLink) => {
        const storageIdMatch = urlLink.match(/\/storage\/([^/]+)/);
        const storageId = storageIdMatch ? storageIdMatch[1] : urlLink;
        return <PlotInChat key={storageId} storageId={storageId} />;
      })}
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
