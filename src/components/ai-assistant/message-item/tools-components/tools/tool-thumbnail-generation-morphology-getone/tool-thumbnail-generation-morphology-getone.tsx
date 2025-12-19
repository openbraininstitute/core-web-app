import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';
import { usePlotFile } from '../hooks';
import type { ToolResult } from '../types';

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
  const { data: file } = usePlotFile(storage_id);
  if (!file) return null;

  const { content, type } = file;
  if (type !== 'image' || !isString(content)) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={content} alt="Morphology thumbnail" />;
}
