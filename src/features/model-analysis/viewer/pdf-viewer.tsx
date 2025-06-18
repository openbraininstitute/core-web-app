'use client';

import { Document, Page, pdfjs } from 'react-pdf';
import { Fragment, useState } from 'react';
import { Divider, Empty, Skeleton } from 'antd';
import lowerCase from 'lodash/lowerCase';

import { useClientCachedUrl } from '@/features/model-analysis/viewer/storage';
import { classNames } from '@/util/utils';
import { entityCoreUrl } from '@/config';

import type { IValidationConstructedResult } from '@/features/model-analysis/explorer/context';
import type { IAsset } from '@/api/entitycore/types/shared/global';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  validationResult: IValidationConstructedResult[number];
};

const options = {
  standardFontDataUrl: '/standard_fonts/',
};
export const AllowedType = 'application/pdf' as const;

export default function PDFViewer({ validationResult }: Props) {
  return (
    <div data-testid="documents-container" className="mt-4 flex flex-col items-center bg-white">
      {validationResult.assets
        ?.filter((o) => o.content_type === AllowedType)
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
              <DocumentViewer validationResult={validationResult} asset={asset} />
            </div>
          );
        })}
      <Divider />
    </div>
  );
}

function DocumentViewer({
  validationResult,
  asset,
}: {
  validationResult: IValidationConstructedResult[number];
  asset: IAsset;
}) {
  const [totalPages, setNumPages] = useState<number>();
  const pdfFileUrl = `${entityCoreUrl}/validation-result/${validationResult.id}/assets/${asset.id}/download`;

  const {
    cachedUrl,
    loading: isCaching,
    error,
  } = useClientCachedUrl({
    url: pdfFileUrl,
    urlKey: `${validationResult.id}/${asset.id}`,
  });

  const onLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);

  if (isCaching || !cachedUrl) {
    return <Skeleton.Image active style={{ width: '478.25px', height: '286.945px' }} />;
  }

  if (error) {
    return (
      <div
        className={classNames(
          'flex h-64! w-96! items-center justify-center rounded-lg',
          'bg-white px-4 py-3 lg:w-2/3 xl:w-1/2'
        )}
        role="alert"
      >
        <Empty
          description="Error loading PDF. Please try again."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="m-0 flex h-full! w-full! flex-col items-center justify-center rounded-none! [&_.ant-empty-description]:text-red-700!"
        />
      </div>
    );
  }

  return (
    <Document
      key={`${validationResult.id}/${asset.id}`}
      options={options}
      file={cachedUrl}
      loading={<Skeleton.Image active style={{ width: '478.25px', height: '286.945px' }} />}
      renderMode="canvas"
      onLoadSuccess={onLoadSuccess}
      className={classNames('w-full lg:w-2/3 xl:w-1/2 [&_canvas]:h-auto! [&_canvas]:w-full!')}
    >
      {Array.from(new Array(totalPages), (_, index) => (
        <Fragment key={`page_${index + 1}`}>
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="border-primary-8 border"
          />
          <div className="text-center">
            Page {index + 1} of {totalPages}
          </div>
        </Fragment>
      ))}
    </Document>
  );
}
