import React from 'react';
import { RightOutlined } from '@ant-design/icons';

import { FlatValidationResult } from '../hooks';
import PDFViewer from '../../asset-viewers/pdf-viewer';
import ImageViewer from '../../asset-viewers/image-viewer';
import Documentation from './documentation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { classNames } from '@/util/utils';

import styles from './validation-result-card.module.css';

export interface ValidationResultCardProps {
  className?: string;
  value: FlatValidationResult;
}

export function ValidationResultCard({ className, value }: ValidationResultCardProps) {
  const renderAsset = useRenderAsset(value);

  return (
    <details key={value.id} className={classNames(className, styles.validationResultCard)} open>
      <summary>
        <h2>
          <RightOutlined />
          <span className="ml-4">{value.name}</span>
          <span className={value.passed ? styles.passed : styles.failed}>
            {value.passed ? 'passed' : 'failed'}
          </span>
        </h2>
      </summary>
      <div className={styles.row}>
        {renderAsset(value.asset)}
        <Documentation value={value} />
      </div>
    </details>
  );
}

function useRenderAsset(value: FlatValidationResult) {
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
