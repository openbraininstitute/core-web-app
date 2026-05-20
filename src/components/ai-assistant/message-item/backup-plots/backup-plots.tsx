import { isToolUIPart } from 'ai';
import React from 'react';

import { classNames } from '@/util/utils';

import { PlotInChat } from '../storage-plots';

import type { UIMessage } from '@ai-sdk/react';

import styles from './backup-plots.module.css';

function extractStorageIdsFromToolResult(result: any): string[] {
  if (result.storage_id) {
    return Array.isArray(result.storage_id) ? result.storage_id : [result.storage_id];
  }

  const fileIdentifier = result.imageLink ?? result.image_link ?? result.url_link;
  if (!fileIdentifier) return [];

  const urlLinks = Array.isArray(fileIdentifier) ? fileIdentifier : [fileIdentifier];
  return urlLinks
    .map(
      (urlLink: string) =>
        urlLink.match(
          /\/storage\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
        )?.[1]
    )
    .filter((id): id is string => id !== undefined);
}

export function extractStorageIdsFromMessage(parts: UIMessage['parts']): string[] {
  const ids: string[] = [];

  parts.forEach((part) => {
    if (!isToolUIPart(part) || part.state !== 'output-available') return;

    try {
      const result = part.output as Record<string, any>;
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

  const backupPlotsData = deferredParts.filter((part) => isToolUIPart(part));

  const textParts = deferredParts.filter((p) => p.type === 'text');
  const lastTextPart = textParts.length > 0 ? textParts[textParts.length - 1].text : undefined;

  const storageIds = extractStorageIdsFromMessage(backupPlotsData);
  const urlLinksWithoutImageLink = storageIds.filter((storageId) => {
    return !lastTextPart?.match(
      new RegExp(`!\\[.*?\\]\\([^)]*\\/storage\\/[^)]*${storageId}[^)]*\\)`)
    );
  });

  const shouldShowPlots = !isLastMessage || status === 'ready';
  const plotsWithContent =
    shouldShowPlots && urlLinksWithoutImageLink.length > 0 ? (
      <BackupPlots storageIds={urlLinksWithoutImageLink} />
    ) : null;

  if (!plotsWithContent) return null;

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
        <PlotInChat key={storageId} storageId={storageId} isBackup />
      ))}
    </div>
  );
}
