/* eslint-disable @next/next/no-img-element */

import { FullscreenOutlined } from '@ant-design/icons';
import React from 'react';

import FullscreenDialog from '@/components/ai-assistant/message-item/plots/fullscreen-dialog/fullscreen-dialog';
import { isString } from '@/util/type-guards';

import ToolSkeleton from '../skeleton/tool-skeleton';

import type { ToolResult } from '../../types';

import dialogStyles from '@/components/ai-assistant/message-item/plots/fullscreen-dialog/fullscreen-dialog.module.css';
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
        <CustomThumbnail providedData={providedData} />
      )}
    </>
  );
}

function CustomThumbnail({ providedData }: { providedData: { content: string; type: string } }) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

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

  return (
    <>
      <div className={styles.container}>
        {imageLoaded && (
          <button
            type="button"
            onClick={handleShow}
            className={styles.fullscreenButton}
            aria-label="View fullscreen"
          >
            <FullscreenOutlined />
          </button>
        )}
        {!imageLoaded && <ToolSkeleton />}
        <img
          className={styles.image}
          src={content}
          alt="Morphology thumbnail"
          style={{
            display: imageLoaded ? 'block' : 'none',
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
      <FullscreenDialog dialogRef={refDialog}>
        <img src={content} alt="Morphology thumbnail" className={dialogStyles.fullscreenImage} />
      </FullscreenDialog>
    </>
  );
}
