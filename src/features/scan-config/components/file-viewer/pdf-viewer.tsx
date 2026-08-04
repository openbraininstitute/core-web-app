'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** bundled with the app so a PDF using the base-14 fonts renders without hitting the network */
const DOCUMENT_OPTIONS = { standardFontDataUrl: '/standard_fonts/' };

type PdfFileViewerProps = {
  file: TActivityCustomFile;
  context: WorkspaceContext;
};

/**
 * A PDF asset, every page rendered down the pane.
 *
 * Fetches through the presigned url rather than the entitycore download route so a PDF inside a
 * directory asset — where the asset id is the directory's and `assetPath` picks the file — works
 * the same as a standalone one.
 */
export function PdfFileViewer({ file, context }: PdfFileViewerProps) {
  const { entity, asset, assetPath } = file;
  const [totalPages, setTotalPages] = useState<number>();

  const { data: url, isLoading } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityId: entity.id,
      assetId: asset.id,
      assetPath,
      ...context,
    }),
    queryFn: async () => {
      const presigned = await getEntityCorePresignedUrl({
        entityType: entity.type as TEntityTypeDict,
        entityId: entity.id,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: asset.id,
        assetPath,
      });
      return presigned.url;
    },
    enabled: !!entity.id && !!asset.id,
    staleTime: Infinity,
  });

  if (isLoading) return <Skeleton className="size-full" />;

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="Failed to load the document" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-6">
      <Document
        key={`${asset.id}/${assetPath ?? ''}`}
        file={url}
        options={DOCUMENT_OPTIONS}
        onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
        loading={<Skeleton className="size-full" />}
        error={
          <div className="flex h-full items-center justify-center">
            <Empty description="This document could not be rendered" />
          </div>
        }
        renderMode="canvas"
        className="flex flex-col items-center gap-4 [&_canvas]:h-auto! [&_canvas]:w-full!"
      >
        {Array.from({ length: totalPages ?? 0 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the page number *is* the identity here
          <div key={`page-${index + 1}`} className="w-full">
            <Page
              pageNumber={index + 1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-sm"
            />
            <div className="pt-2 text-center text-xs text-neutral-3">
              Page {index + 1} of {totalPages}
            </div>
          </div>
        ))}
      </Document>
    </div>
  );
}
