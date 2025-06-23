'use client';

import { match, P } from 'ts-pattern';
import { useCallback } from 'react';
import { Divider } from 'antd';
import lowerCase from 'lodash/lowerCase';

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
    <div data-testid="documents-container" className="mt-4 flex flex-col items-center bg-white">
      {validationResult.assets
        ?.filter((o) => AllowedTypes.includes(o.content_type as TAllowedTypes))
        .map((asset, ix) => {
          return (
            <div
              id={`document_${asset.id}`}
              key={`document_${asset.id}`}
              className="mb-5 flex w-full flex-col items-center"
            >
              <h2 className="text-primary-8 mb-6 flex w-max items-center justify-center self-start p-3 text-center text-xl font-bold capitalize">
                <span className="bg-neutral-1 flex h-12! w-12! items-center justify-center">
                  {ix + 1}
                </span>
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
