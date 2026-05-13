'use client';

import { useEffect, useState } from 'react';

import { useAccessToken } from '@/hooks/useAccessToken';
import { serviceAiAgentUrl } from '@/services/ai-agent/api/url';

import styles from './message-item.module.css';

/**
 * Module-level cache so resolved presigned URLs persist across re-renders
 * and component remounts (e.g. when scrolling or switching tabs).
 */
const presignedUrlCache: Record<string, string> = {};

interface StorageImagePartProps {
  url: string;
  filename?: string;
}

/**
 * Renders an image from a storage:// URL by resolving it to a presigned S3 URL.
 * Follows the same pattern as neuroagent-ts/frontend ChatMessageHuman.
 */
export function StorageImagePart({ url, filename }: StorageImagePartProps) {
  const accessToken = useAccessToken();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    () => presignedUrlCache[url] ?? null
  );
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (resolvedUrl || !accessToken) return;

    const uuid = url.replace('storage://', '');
    fetch(serviceAiAgentUrl(`storage/${uuid}/presigned-url`), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((presignedUrl: string) => {
        presignedUrlCache[url] = presignedUrl;
        setResolvedUrl(presignedUrl);
      })
      .catch(() => {
        setBroken(true);
      });
  }, [url, accessToken, resolvedUrl]);

  if (broken) {
    return (
      <div className={styles.userImagePlaceholder}>
        <span>Image could not be loaded</span>
      </div>
    );
  }

  if (!resolvedUrl) {
    return <div className={styles.userImagePlaceholder} />;
  }

  return (
    <img
      src={resolvedUrl}
      alt={filename ?? 'Attached image'}
      className={styles.userImage}
      onError={() => setBroken(true)}
    />
  );
}
