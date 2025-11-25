'use client';

import { match, P } from 'ts-pattern';
import { useCallback } from 'react';
import { Divider } from 'antd';
import capitalize from 'es-toolkit/compat/capitalize';

import Documentation from './documentation';

import ImageViewer from '@/features/model-analysis/viewer/image-viewer';
import PDFViewer from '@/features/model-analysis/viewer/pdf-viewer';
import { AllowedTypes } from '@/features/model-analysis/viewer/storage';
import type { TAllowedTypes } from '@/features/model-analysis/viewer/storage';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import { TEntityTypeDict } from '@/api/entitycore/types';

import styles from './viewer.module.css';

type Props = {
  entity: {
    id: string;
    type: TEntityTypeDict;
    passed: boolean;
    assets: IAsset[] | null;
  };
  entityType: TEntityTypeDict;
  pdfShowPageCount?: boolean;
};

export default function AssetViewer({ entity, entityType, pdfShowPageCount = true }: Props) {
  const content = useCallback(
    (asset: IAsset) => {
      return match({ asset })
        .with({ asset: { content_type: 'application/pdf' } }, () => {
          return (
            <PDFViewer
              entityId={entity.id}
              assetId={asset.id}
              entityType={entityType}
              showPageCount={pdfShowPageCount}
            />
          );
        })
        .with({ asset: { content_type: P.union('image/png', 'image/jpeg', 'image/jpg') } }, () => {
          return <ImageViewer entityId={entity.id} assetId={asset.id} entityType={entity.type} />;
        })
        .otherwise(() => null);
    },
    [entity, pdfShowPageCount, entityType]
  );

  const assets = (entity.assets ?? []).sort(sortByPath);
  return (
    <div data-testid="documents-container" className="mt-4 flex flex-col items-center">
      {assets
        .filter((o) => AllowedTypes.includes(o.content_type as TAllowedTypes))
        .map((asset) => {
          return (
            <div
              id={`document_${asset.id}`}
              key={`document_${asset.id}`}
              className="mb-5 flex w-full flex-col items-stretch"
            >
              <h2 className="text-primary-8 border-neutral-2 mb-6 flex w-full justify-between rounded-full border p-3 text-xl font-bold">
                <span className="ml-4">{resolveCaption(asset.path)}</span>
                <span className={entity.passed ? styles.passed : styles.failed}>
                  {entity.passed ? 'passed' : 'failed'}
                </span>
              </h2>
              <div className={styles.row}>
                {content(asset)}
                <Documentation assetPath={asset.path} />
              </div>
            </div>
          );
        })}
      <Divider />
    </div>
  );
}

const ACRONYMS = ['AIS', 'BPAP', 'FI'];

function resolveCaption(assetPath: string) {
  const prefix = assetPath.split('.')[0];
  return prefix
    .split('_')
    .map((item) => {
      const text = capitalize(item);
      const upperCaseText = text.toUpperCase();
      if (upperCaseText === 'ZOOMED') return '(zoomed)';

      return ACRONYMS.includes(upperCaseText) ? upperCaseText : text;
    })
    .join(' ');
}

function sortByPath(a: IAsset, b: IAsset): number {
  if (a.path < b.path) return -1;
  if (a.path > b.path) return +1;
  return 0;
}
