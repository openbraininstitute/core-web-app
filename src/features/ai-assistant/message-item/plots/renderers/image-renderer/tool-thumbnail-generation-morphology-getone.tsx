/* eslint-disable @next/next/no-img-element */

import { FullscreenOutlined } from '@ant-design/icons';
import React from 'react';

import FullscreenDialog from '@/features/ai-assistant/message-item/plots/fullscreen-dialog/fullscreen-dialog';
import { isString } from '@/util/type-guards';

import ToolSkeleton from '../skeleton/tool-skeleton';

import type { ToolResult } from '../../types';

import dialogStyles from '@/features/ai-assistant/message-item/plots/fullscreen-dialog/fullscreen-dialog.module.css';
import styles from './tool-thumbnail-generation-morphology-getone.module.css';

export interface ToolThumbnailGenerationProps {
  className?: string;
  result: ToolResult | null;
  data?: { content: string; type: string };
  isStreaming?: boolean;
  skipSkeleton?: boolean;
}

export default function ToolThumbnailGeneration({
  className,
  result,
  data: providedData,
  isStreaming,
  skipSkeleton,
}: ToolThumbnailGenerationProps) {
  if (!result) return null;

  return (
    <>
      {typeof result.storage_id === 'string' && providedData && (
        <CustomThumbnail
          providedData={providedData}
          isStreaming={isStreaming}
          skipSkeleton={skipSkeleton}
        />
      )}
    </>
  );
}

function CustomThumbnail({
  providedData,
  isStreaming,
  skipSkeleton,
}: {
  providedData: { content: string; type: string };
  isStreaming?: boolean;
  skipSkeleton?: boolean;
}) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(!!skipSkeleton);
  const [imageError, setImageError] = React.useState(false);

  // Freeze the animation decision at mount time — no re-trigger if isStreaming flips.
  const shouldAnimateRef = React.useRef(!!isStreaming);
  const [animationDone, setAnimationDone] = React.useState(!shouldAnimateRef.current);

  // Single-fire timer: runs once on mount if animating. Empty deps = no re-trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional single-fire on mount
  React.useEffect(() => {
    if (!shouldAnimateRef.current) return;
    const timer = setTimeout(() => setAnimationDone(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const showImage = imageLoaded && animationDone;

  const { content, type } = providedData;
  if (type !== 'image' || !isString(content)) return null;

  const handleShow = () => {
    refDialog.current?.showModal();
  };

  if (imageError) {
    return (
      <div className="my-4">
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {content}
        </a>
      </div>
    );
  }

  const containerEl = (
    <div className={styles.container}>
      {showImage && (
        <button
          type="button"
          onClick={handleShow}
          className={styles.fullscreenButton}
          aria-label="View fullscreen"
        >
          <FullscreenOutlined />
        </button>
      )}
      {!showImage && !skipSkeleton && <ToolSkeleton />}
      <img
        className={styles.image}
        src={content}
        alt="Morphology thumbnail"
        style={{
          display: showImage ? 'block' : 'none',
          cursor: 'pointer',
        }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        onClick={handleShow}
        onKeyDown={(event) => {
          if (['Enter', ' '].includes(event.key)) handleShow();
        }}
      />
    </div>
  );

  return (
    <>
      {shouldAnimateRef.current ? (
        <div className={styles.streamingReveal}>{containerEl}</div>
      ) : (
        containerEl
      )}
      <FullscreenDialog dialogRef={refDialog}>
        <img src={content} alt="Morphology thumbnail" className={dialogStyles.fullscreenImage} />
      </FullscreenDialog>
    </>
  );
}
