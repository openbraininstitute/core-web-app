import React from 'react';

import { classNames } from '@/util/utils';

import { isToolResult, PlotInChat } from '../storage-plots';

import type { ToolInvocationUIPart, UIMessage } from '@ai-sdk/ui-utils';

import styles from './backup-plots.module.css';

function extractStorageIdsFromToolResult(result: any): string[] {
  const fileIdentifier = result.image_link ?? result.url_link ?? result.storage_id;
  if (!fileIdentifier) return [];

  const urlLinks = Array.isArray(fileIdentifier) ? fileIdentifier : [fileIdentifier];
  return urlLinks
    .map((urlLink: string) => {
      const match = urlLink.match(/\/storage\/([^/]+)/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => id !== null);
}

export function extractStorageIdsFromMessage(parts: UIMessage['parts']): string[] {
  const ids: string[] = [];

  parts.forEach((part) => {
    if (part.type !== 'tool-invocation' || part.toolInvocation.state !== 'result') return;

    try {
      const result = JSON.parse(part.toolInvocation.result);
      ids.push(...extractStorageIdsFromToolResult(result));
    } catch {}
  });

  return ids;
}

export interface BackupPlotsProps {
  className?: string;
  storageIds: string[];
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

    const storageIds = extractStorageIdsFromToolResult(result);
    const urlLinksWithoutImageLink = storageIds.filter((storageId) => {
      return !lastTextPart?.match(new RegExp(`!\\[.*?\\]\\([^)]*\\/storage\\/${storageId}\\)`));
    });

    if (urlLinksWithoutImageLink.length > 0) {
      plotsWithContent.push(
        <BackupPlots
          key={(part as any).toolInvocation.toolCallId}
          storageIds={urlLinksWithoutImageLink}
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

export default function BackupPlots({ className, storageIds }: BackupPlotsProps) {
  return (
    <div className={classNames(className, styles.backupPlots)}>
      {storageIds.map((storageId) => (
        <PlotInChat key={storageId} storageId={storageId} />
      ))}
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
