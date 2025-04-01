'use client';

import Image from 'next/image';
import { Fragment, useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Divider, Skeleton, Empty } from 'antd';
import { AnalysisType, typeLabel } from './types';
import { getSession } from '@/authFetch';
import { classNames } from '@/util/utils';
import { useAccessToken } from '@/hooks/useAccessToken';
import { fetchResourceByIdRaw } from '@/api/nexus';
import { nexus } from '@/config';
import { composeUrl } from '@/util/nexus';
import styles from './styles.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

type Props = {
  distribution: Distribution;
};

const options = {
  standardFontDataUrl: '/standard_fonts/',
};

type Distribution = { '@id': string; about: string; org?: string; project?: string };

export default function PDFViewer({ distribution }: Props) {
  const [totalPages, setNumPages] = useState<number>();
  const token = useAccessToken();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const parts = distribution.about.split('/');
  const type = parts.at(-1) as AnalysisType;

  const id = distribution['@id'];

  const pdfFile = useMemo(
    () => ({
      url: composeUrl('resource', id, {
        org: distribution.org,
        project: distribution.project,
      }),
      httpHeaders: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }),
    [token, id, distribution.org, distribution.project]
  );

  return (
    <div className="mt-4 flex flex-col items-center">
      {type && (
        <h2 className="mb-6 w-full bg-neutral-1 p-3 text-center text-2xl font-bold text-primary-8">
          {typeLabel(type)}
        </h2>
      )}
      {type === 'thumbnail' ? (
        <ImageViewer
          contentUrl={distribution['@id']}
          org={distribution.org}
          project={distribution.project}
        />
      ) : (
        <Document
          options={options}
          file={pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          className={classNames('w-full lg:w-2/3 xl:w-1/2', styles.pdf)}
        >
          {Array.from(new Array(totalPages), (el, index) => (
            <Fragment key={distribution['@id']}>
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="border border-primary-8"
              />
              <div className="text-center">
                Page {index + 1} of {totalPages}
              </div>
            </Fragment>
          ))}
        </Document>
      )}
      <Divider />
    </div>
  );
}

function ImageViewer({
  contentUrl,
  org,
  project,
}: {
  contentUrl: string;
  org?: string;
  project?: string;
}) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetch = async () => {
      const session = await getSession();
      if (!session) {
        return null;
      }
      setLoading(true);

      const res = await fetchResourceByIdRaw(contentUrl, session, { org, project });

      const blob = await res.blob();
      setThumbnail(URL.createObjectURL(blob));
    };

    try {
      fetch();
    } finally {
      setLoading(false);
    }
  }, [contentUrl, org, project]);

  if (thumbnail) {
    return (
      <div className="relative flex h-96 w-full max-w-2xl items-center justify-center">
        <Image
          fill
          objectFit="contains"
          alt="Stimulus plot"
          className="border border-neutral-2"
          src={thumbnail}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      {loading ? (
        <Skeleton.Image
          active={loading}
          className="!h-full !w-full rounded-none"
          rootClassName="!h-full !w-full"
        />
      ) : (
        <Empty description="No thumbnail available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
}
