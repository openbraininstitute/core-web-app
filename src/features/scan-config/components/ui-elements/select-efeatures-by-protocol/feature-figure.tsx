'use client';

import { Image } from 'antd';
import { useState } from 'react';

import { cn } from '@/utils/css-class';

/**
 * The eFEL illustration for a figure, or nothing.
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
    <Image
      src={url}
      alt={`eFEL illustration for ${label}`}
      rootClassName="w-full"
      // the figures are black linework on a transparent background — they vanish against the
      // preview's dark scrim, so the white they were drawn for is supplied here
      className={cn('rounded bg-white', className)}
      // letting one crop would cut a measurement bar
      style={{ objectFit: 'contain' }}
      loading="lazy"
      onError={() => setFailedUrl(url)}
      preview={{
        mask: <span className="text-xs font-semibold">View full size</span>,
        maskClassName: 'rounded',
        // The white has to sit on the image element itself, not on a wrapper around it: zoom and
        // rotate are a transform on that element, so a wrapper keeps its own size and the figure
        // scales straight off its backdrop. Padding would break the same way, hence the border.
        rootClassName: cn(
          '[&_.ant-image-preview-img]:bg-white [&_.ant-image-preview-img]:rounded',
          '[&_.ant-image-preview-img]:border-8 [&_.ant-image-preview-img]:border-white'
        ),
      }}
    />
  );
}
