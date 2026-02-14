'use client';

import { Empty, Skeleton } from 'antd';
import { kebabCase } from 'es-toolkit/compat';
import { Fragment, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { IconDownloadFile } from '@/components/LandingPage/icons/IconDownloadFile';
import { config } from '@/config';
import { useClientCachedUrl } from '@/features/model-analysis/viewer/asset-viewers/storage';
import { classNames } from '@/util/utils';

import type { TEntityTypeDict } from '@/api/entitycore/types';

import styles from './pdf-viewer.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  entityType: TEntityTypeDict;
  entityId: string;
  assetId: string;
  showPageCount?: boolean;
  documentClassName?: string;
  pageWidth?: number;
};

const options = {
  standardFontDataUrl: '/standard_fonts/',
};

export default function PDFViewer({
  entityType,
  entityId,
  assetId,
  showPageCount = true,
  documentClassName,
  pageWidth,
}: Props) {
  const [totalPages, setNumPages] = useState<number>();
  const pdfFileUrl = `${config.ENTITY_CORE_URL}/${kebabCase(entityType)}/${entityId}/assets/${assetId}/download`;

  const {
    cachedUrl,
    loading: isCaching,
    error,
  } = useClientCachedUrl({
    url: pdfFileUrl,
    urlKey: `${entityId}/${assetId}`,
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
          'bg-white px-4 py-3 lg:w-2/3'
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
    <div>
      <Document
        key={`${entityId}/${assetId}`}
        options={options}
        file={cachedUrl}
        loading={<Skeleton.Image active style={{ width: '478.25px', height: '286.945px' }} />}
        renderMode="canvas"
        onLoadSuccess={onLoadSuccess}
        className={documentClassName ?? classNames('[&_canvas]:h-auto! [&_canvas]:w-full!')}
      >
        {Array.from(new Array(totalPages), (_, index) => (
          <Fragment key={`page_${index + 1}`}>
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              width={pageWidth}
            />
            {showPageCount && (
              <div className="text-center">
                Page {index + 1} of {totalPages}
              </div>
            )}
          </Fragment>
        ))}
      </Document>
      <a className={styles.link} href={cachedUrl} target="PDF" download={`${assetId}.pdf`}>
        <IconDownloadFile /> <div>Download as PDF</div>
      </a>
    </div>
  );
}

export { PDFViewer };
