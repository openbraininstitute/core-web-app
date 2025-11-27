import React from 'react';

import { ToolResult } from '../types';

import { classNames } from '@/util/utils';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useAsyncMemo } from '@/hooks/async-memo';
import { serviceAiAgentStorageGetFileContent } from '@/services/ai-agent/api/storage';
import { logError } from '@/util/logger';
import { isString } from '@/util/type-guards';

import styles from './tool-thumbnail-generation-morphology-getone.module.css';

export interface ToolThumbnailGenerationProps {
  className?: string;
  result: ToolResult | null;
}

export default function ToolThumbnailGeneration({
  className,
  result,
}: ToolThumbnailGenerationProps) {
  if (!result) return null;
  return (
    <>
      {typeof result.storage_id === 'string' && (
        <CustomThumbnail
          key={result.storage_id}
          className={classNames(className, styles.toolThumbnailGenerationMorphologyGetone)}
          storage_id={result.storage_id}
        />
      )}
    </>
  );
}

function CustomThumbnail({ className, storage_id }: { className?: string; storage_id: string }) {
  const file = usePlotFile(storage_id);
  if (!file) return null;

  const { content, type } = file;
  if (type !== 'image' || !isString(content)) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={content} alt="Morphology thumbnail" />;
}

function usePlotFile(fileIdentifier: string) {
  const accessToken = useAccessToken() ?? 'NO-TOKEN';
  const file = useAsyncMemo(fileIdentifier, async () => {
    try {
      const data = await serviceAiAgentStorageGetFileContent({
        accessToken,
        fileIdentifier,
      });
      return data;
    } catch (ex) {
      logError(`Unable to retrieve file "${fileIdentifier}":`, ex);
      return null;
    }
  });

  return file;
}
