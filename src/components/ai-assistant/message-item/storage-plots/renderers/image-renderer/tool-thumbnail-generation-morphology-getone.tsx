import React from 'react';

import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import ToolSkeleton from '../skeleton/tool-skeleton';

import type { ToolResult } from '../../types';

import styles from './tool-thumbnail-generation-morphology-getone.module.css';

export interface ToolThumbnailGenerationProps {
  className?: string;
  result: ToolResult | null;
  data?: { content: string; type: string };
}

export default function ToolThumbnailGeneration({
  className,
  result,
  data: providedData,
}: ToolThumbnailGenerationProps) {
  if (!result) return null;

  return (
    <>
      {typeof result.storage_id === 'string' && providedData && (
        <CustomThumbnail
          className={classNames(className, styles.toolThumbnailGenerationMorphologyGetone)}
          providedData={providedData}
        />
      )}
    </>
  );
}

function CustomThumbnail({
  className,
  providedData,
}: {
  className?: string;
  providedData: { content: string; type: string };
}) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const { content, type } = providedData;
  if (type !== 'image' || !isString(content)) return null;

  const handleShow = () => {
    refDialog.current?.showModal();
  };

  const handleHide = () => {
    refDialog.current?.close();
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

  return (
    <>
      <div className={styles.container}>
        {!imageLoaded && <ToolSkeleton />}
        <img
          className={className}
          src={content}
          alt="Morphology thumbnail"
          style={{
            display: imageLoaded ? 'block' : 'none',
            cursor: 'pointer',
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          onClick={handleShow}
        />
      </div>
      <dialog ref={refDialog} className={styles.dialog}>
        <button
          type="button"
          onClick={handleHide}
          className={styles.closeButton}
          aria-label="Close fullscreen"
        >
          ✕
        </button>
        <button type="button" onClick={handleHide} className={styles.imageBackdrop}>
          <img src={content} alt="Morphology thumbnail fullscreen" />
        </button>
      </dialog>
    </>
  );
}
