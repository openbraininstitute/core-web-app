'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty, Image } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { BundledLanguage } from 'shiki';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { EntityCoreResource, IAsset } from '@/api/entitycore/types/shared/global';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import type { WorkspaceContext } from '@/types/common';
import { CodeBlock, CodeBlockCopyButton } from '@/ui/molecules/code-blocks';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function FileViewer({
  asset,
  entity,
  context,
}: {
  asset: IAsset;
  entity: Partial<EntityCoreResource>;
  context: WorkspaceContext;
}) {
  const isImage = asset.content_type.startsWith('image/');
  const isPdf = asset.content_type === 'application/pdf';
  const isJson = asset.content_type === 'application/json';
  const isMod = asset.label === AssetLabel.neuron_mechanisms;

  const { data: presignedData, isLoading: isLoadingUrl } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityId: entity.id,
      assetId: asset.id,
      ...context,
    }),
    queryFn: async () => {
      return getEntityCorePresignedUrl({
        entityType: entity.type as TEntityTypeDict,
        entityId: entity.id!,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: asset.id,
      });
    },
    enabled: !!entity.id && !!asset.id,
  });

  if (isLoadingUrl) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!presignedData?.url) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="Failed to load file" />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="w-full">
        <h3 className="mb-3 text-lg font-semibold">{asset.path}</h3>
        <div className="w-full">
          <Image
            preview
            src={presignedData.url}
            alt={asset.path}
            className="w-full"
            style={{ height: 'auto', maxWidth: '100%' }}
          />
        </div>
      </div>
    );
  }

  if (isPdf) {
    return <PDFViewer url={presignedData.url} filename={asset.path} />;
  }

  if (isJson || isMod) {
    return (
      <CodeFileViewer
        url={presignedData.url}
        filename={asset.path}
        language={isJson ? 'json' : 'shellscript'}
      />
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{asset.path}</h3>
      <p className="text-gray-500">Preview not available for this file type</p>
    </div>
  );
}

export function PDFViewer({ url, filename }: { url: string; filename: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pageSize, setPageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current && pageSize) {
        const containerWidth = containerRef.current.clientWidth - 40;
        const containerHeight = containerRef.current.clientHeight - 40;

        const scaleX = containerWidth / pageSize.width;
        const scaleY = containerHeight / pageSize.height;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [pageSize]);

  const handlePageLoad = ({ width, height }: { width: number; height: number }) => {
    if (!pageSize) {
      setPageSize({ width, height });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h3 className="mb-2 flex-shrink-0 text-base font-semibold">{filename}</h3>
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden bg-gray-50"
      >
        <Document
          file={url}
          onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
          loading={<Skeleton className="h-full w-full" />}
          error={<Empty description="Error loading PDF" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        >
          <Page
            pageNumber={1}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            scale={scale}
            onLoadSuccess={handlePageLoad}
          />
        </Document>
      </div>
      {numPages > 1 && (
        <div className="flex-shrink-0 pt-1 text-center text-xs text-gray-500">
          Page 1 of {numPages}
        </div>
      )}
    </div>
  );
}

export function CodeFileViewer({
  url,
  filename,
  language,
}: {
  url: string;
  filename: string;
  language: BundledLanguage;
}) {
  const { data: content, isLoading } = useQuery({
    queryKey: ['file-content', url],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch file');
      return response.text();
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="Failed to load file content" />
      </div>
    );
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      log('error', 'Failed to copy code to clipboard', error);
      throw error;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CodeBlock
        code={content}
        language={language}
        showLineNumbers
        title={filename}
        className={cn(
          'secondary-scrollbar h-full overflow-auto [&_pre]:overflow-x-auto',
          '[&_pre]:whitespace-pre [&>div]:overflow-auto [&>div>div]:overflow-x-auto',
          'border-neutral-3 bg-white! [&_.shiki]:bg-white! [&_.shiki]:shadow-xl!',
        )}
      >
        <div className="bg-neutral-light flex items-center justify-between px-2 py-2">
          <CodeBlockCopyButton
            onCopy={handleCopy}
            onError={() => {}}
            className="ml-auto size-8 self-end rounded-full px-2 hover:bg-gray-300"
            iconClassName="text-gray-500 size-4"
          />
        </div>
      </CodeBlock>
    </div>
  );
}
