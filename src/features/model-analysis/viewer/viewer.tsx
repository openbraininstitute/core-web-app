'use client';

import { match, P } from 'ts-pattern';
import { useCallback } from 'react';
import { Divider } from 'antd';
import lowerCase from 'es-toolkit/compat/lowerCase';

import ImageViewer from '@/features/model-analysis/viewer/image-viewer';
import PDFViewer from '@/features/model-analysis/viewer/pdf-viewer';
import { AllowedTypes } from '@/features/model-analysis/viewer/storage';

import type { IValidationConstructedResult } from '@/features/model-analysis/explorer/context';
import type { TAllowedTypes } from '@/features/model-analysis/viewer/storage';
import type { IAsset } from '@/api/entitycore/types/shared/global';

type Props = {
  validationResult: IValidationConstructedResult[number];
};

export default function AssetViewer({ validationResult }: Props) {
  const content = useCallback(
    (asset: IAsset) => {
      return match({ asset })
        .with({ asset: { content_type: 'application/pdf' } }, () => {
          return <PDFViewer validationResult={validationResult} asset={asset} />;
        })
        .with({ asset: { content_type: P.union('image/png', 'image/jpeg', 'image/jpg') } }, () => {
          return <ImageViewer validationResult={validationResult} asset={asset} />;
        })
        .otherwise(() => null);
    },
    [validationResult]
  );

  return (
    <div data-testid="documents-container" className="mt-4 flex flex-col items-center">
      {validationResult.assets
        ?.filter((o) => AllowedTypes.includes(o.content_type as TAllowedTypes))
        .map((asset) => {
          return (
            <div
              id={`document_${asset.id}`}
              key={`document_${asset.id}`}
              className="mb-5 flex w-full flex-col items-center"
            >
              <h2 className="text-primary-8 border-neutral-2 mb-6 block! w-full rounded-full border p-3 text-xl font-bold capitalize">
                <span className="ml-4">{lowerCase(asset.path.split('.').at(0))}</span>
              </h2>
              {content(asset)}
            </div>
          );
        })}
      <Divider />
    </div>
  );
}
