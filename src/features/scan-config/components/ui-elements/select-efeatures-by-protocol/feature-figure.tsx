'use client';

import { useState } from 'react';

/**
 * The eFEL illustration for a feature, or nothing.
 *
 * Not every feature has a figure, and the URL is addressed by eFEL key rather than declared by
 * the schema, so a miss is expected rather than exceptional — it must collapse silently instead
 * of leaving a broken-image placeholder. Both the settings form and the preview panel render it
 * through here so they behave the same way.
 */
export function EFeatureFigure({
  url,
  label,
  className,
}: {
  url: string | null;
  label: string;
  className?: string;
}) {
  // the url that failed, rather than a boolean: a different figure then gets a fresh attempt
  // without an effect to reset the flag
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!url || failedUrl === url) return null;

  return (
    // biome-ignore lint/performance/noImgElement: remote eFEL figure on an unconfigured host
    <img
      src={url}
      alt={`eFEL illustration for ${label}`}
      className={className ?? 'max-w-full rounded'}
      loading="lazy"
      onError={() => setFailedUrl(url)}
    />
  );
}
