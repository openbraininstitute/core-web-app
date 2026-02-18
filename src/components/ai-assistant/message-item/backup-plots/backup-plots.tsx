import React from 'react';

import { classNames } from '@/util/utils';

import PlotInChat from './tools/plot-in-chat';
import { isToolResult } from './tools/types';

import type { ToolInvocationUIPart } from '@ai-sdk/ui-utils';

import styles from './backup-plots.module.css';

export interface BackupPlotsProps {
  className?: string;
  part: ToolInvocationUIPart;
  lastTextPart?: string;
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
