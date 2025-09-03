import React from 'react';

import { ToolResult } from '../types';

import { classNames } from '@/util/utils';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useAsyncMemo } from '@/hooks/async-memo';
import { serviceAiAgentStorageGetFileContent } from '@/services/ai-agent/api/storage';
import { logError } from '@/util/logger';
import { isString } from '@/util/type-guards';

import { log } from '@/utils/logger';
import styles from './tool-thumbnail-generation-morphology-getone.module.css';

export interface ToolThumbnailGenerationProps {
  className?: string;
  results: ToolResult[];
}

export default function ToolThumbnailGeneration({
  className,
  results,
}: ToolThumbnailGenerationProps) {
  return (
    <>
      {results.map((result) => (
        <CustomThumbnail
          key={result.storage_id}
          className={classNames(className, styles.toolThumbnailGenerationMorphologyGetone)}
          result={result}
        />
      ))}
    </>
  );
}

function CustomThumbnail({ className, result }: { className?: string; result: ToolResult }) {
  const file = usePlotFile(result.storage_id);
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
      log(
        'log',
        '🚀 [tool-thumbnail-generation-morphology-getone] fileIdentifier =',
        fileIdentifier
      ); // @FIXME: Remove this line written on 2025-09-02 at 11:06
      const data = await serviceAiAgentStorageGetFileContent({
        accessToken,
        fileIdentifier,
      });
      log('log', '🚀 [tool-thumbnail-generation-morphology-getone] data =', data); // @FIXME: Remove this line written on 2025-09-02 at 11:06
      return data;
    } catch (ex) {
      logError(`Unable to retrieve file "${fileIdentifier}":`, ex);
      return null;
    }
  });

  return file;
}
