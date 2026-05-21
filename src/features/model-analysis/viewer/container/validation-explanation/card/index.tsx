import { RightOutlined } from '@ant-design/icons';
import React from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import ImageViewer from '@/features/model-analysis/viewer/asset-viewers/image-viewer';
import PDFViewer from '@/features/model-analysis/viewer/asset-viewers/pdf-viewer';
import type { DetailViewVariant } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';
import { classNames } from '@/util/utils';

import Documentation from './documentation/documentation';

import type { FlatValidationResult } from '@/features/model-analysis/viewer/container/hooks';

import styles from './validation-result-card.module.css';

export interface ValidationResultCardProps {
  className?: string;
  value: FlatValidationResult;
  variant?: DetailViewVariant;
}

export function ValidationResultCard({
  className,
  value,
  variant = 'light',
}: ValidationResultCardProps) {
  const renderAsset = useRenderAsset(value, variant);
  const onPrimary = variant === 'onPrimary';

  return (
    <details
      key={value.id}
      className={classNames(className, styles.validationResultCard, onPrimary && styles.onPrimary)}
      open
    >
      <summary
        className={cn(
          'group cursor-pointer rounded-full hover:shadow-xs',
          onPrimary ? 'hover:bg-white/10' : 'hover:bg-gray-100/50'
        )}
      >
        <h2>
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-full border p-1',
              onPrimary
                ? 'border-white/20 group-hover:bg-white/15'
                : 'border-gray-100 group-hover:bg-gray-200'
            )}
          >
            <RightOutlined className={cn('size-4', onPrimary && 'text-white')} />
          </div>
          <span className={cn('ml-4', onPrimary && 'text-white')}>{value.name}</span>
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

function useRenderAsset(value: FlatValidationResult, variant: DetailViewVariant) {
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
    [value]
  );
}
