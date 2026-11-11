import { RightOutlined } from '@ant-design/icons';
import React from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant } from '@/constants';
import ImageViewer from '@/features/model-analysis/viewer/asset-viewers/image-viewer';
import PDFViewer from '@/features/model-analysis/viewer/asset-viewers/pdf-viewer';
import { cn } from '@/utils/css-class';

import Documentation from './documentation/documentation';

import type { FlatValidationResult } from '@/features/model-analysis/viewer/container/hooks';

import styles from './validation-result-card.module.css';

export interface ValidationResultCardProps {
  className?: string;
  value: FlatValidationResult;
  variant?: TViewVariant;
}

export function ValidationResultCard({
  className,
  value,
  variant = ViewVariant.Light,
}: ValidationResultCardProps) {
  const renderAsset = useRenderAsset(value, variant);
  const isPrimary = variant === ViewVariant.Default;

  return (
    <details key={value.id} className={cn(className, styles.validationResultCard)} open>
      <summary
        className={cn('group cursor-pointer rounded-full hover:shadow-xs', {
          'hover:bg-white/10': isPrimary,
          'hover:bg-gray-100/50': !isPrimary,
        })}
      >
        <h2 className={cn({ 'border-white/20! text-white!': isPrimary })}>
          <div
            className={cn('flex size-8 items-center justify-center rounded-full border p-1', {
              'border-white/20 group-hover:bg-white/15': isPrimary,
              'border-gray-100 group-hover:bg-gray-200': !isPrimary,
            })}
          >
            <RightOutlined className={cn('size-4', { 'text-white': isPrimary })} />
          </div>
          <span className={cn('ml-4', { 'text-white': isPrimary })}>{value.name}</span>
          <span className={value.passed ? styles.passed : styles.failed}>
            {value.passed ? 'passed' : 'failed'}
          </span>
        </h2>
      </summary>
      <div className={styles.row}>
        {renderAsset(value.asset)}
        <Documentation value={value} variant={variant} />
      </div>
    </details>
  );
}

function useRenderAsset(value: FlatValidationResult, variant: TViewVariant) {
  return React.useCallback(
    (asset: FlatValidationResult['asset']) => {
      if (!asset) return null;

      switch (asset.type) {
        case 'application/pdf':
          return (
            <PDFViewer
              entityId={value.entityId}
              assetId={value.assetId}
              entityType={ExtendedEntitiesTypeDict.ValidationResult}
              variant={variant}
            />
          );
        case 'image/png':
        case 'image/jpg':
        case 'image/jpeg':
          return (
            <ImageViewer
              entityId={value.entityId}
              assetId={value.assetId}
              entityType={ExtendedEntitiesTypeDict.ValidationResult}
            />
          );
        default:
          return null;
      }
    },
    [value, variant]
  );
}
