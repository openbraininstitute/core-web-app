'use client';

import { RiArrowLeftSLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { useMemo, useState } from 'react';

import { listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { FileIcon } from '@/components/icons';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';
import { formatBytes } from '@/utils/format';

import {
  buildDirectoryLevel,
  fileExtension,
  makeDirectoryChildFile,
  parentPrefix,
} from './directory-entries';

import type { ReactNode } from 'react';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';
import type { TDirectoryFileEntry } from './directory-entries';

const THUMBNAIL_CONTENT_TYPES = new Set([
  AssetContentType.png,
  AssetContentType.jpeg,
  AssetContentType.webp,
]);

type DirectoryFileViewerProps = {
  file: TActivityCustomFile;
  context: WorkspaceContext;
  /**
   * Renders a file the user opened from the listing. Passed in rather than imported so the
   * directory viewer stays one of the viewers `FileViewer` dispatches to, instead of a second
   * place that has to know about every content type.
   */
  renderChild: (file: TActivityCustomFile) => ReactNode;
};

/**
 * The contents of a directory asset, as a thumbnail grid.
 *
 * A directory asset has no single file to preview — an extraction writes a whole `figures/` folder
 * under one asset id — so the pane lists what is inside: images render their own thumbnail,
 * anything else gets a placeholder tile, and opening one swaps the grid for that file's viewer
 * with a back control.
 */
export function DirectoryFileViewer({ file, context, renderChild }: DirectoryFileViewerProps) {
  const { asset, entity } = file;
  const [prefix, setPrefix] = useState('');
  const [openedEntry, setOpenedEntry] = useState<TDirectoryFileEntry | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      'asset-directory-listing',
      context.virtualLabId,
      context.projectId,
      entity.id,
      asset.id,
    ],
    queryFn: () =>
      listDirectoryOfAssets({
        ctx: context,
        entityType: entity.type as TEntityTypeDict,
        entityId: entity.id,
        id: asset.id,
      }),
    enabled: !!entity.id && !!asset.id,
    staleTime: 5 * 60 * 1000,
  });

  const level = useMemo(
    () => buildDirectoryLevel(data?.files ?? {}, prefix),
    [data?.files, prefix]
  );

  if (openedEntry) {
    const childFile = makeDirectoryChildFile({ asset, entity, entry: openedEntry });
    return (
      <div className="flex h-full w-full flex-col">
        <DirectoryBackBar label={openedEntry.name} onBack={() => setOpenedEntry(null)} />
        <div className="relative min-h-0 flex-1">{renderChild(childFile)}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder tiles have no identity
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description="Failed to list the folder contents" />
      </div>
    );
  }

  const isEmpty = level.folders.length === 0 && level.files.length === 0;

  return (
    <div className="flex h-full w-full flex-col">
      {prefix ? (
        <DirectoryBackBar
          label={prefix.replace(/\/$/, '')}
          onBack={() => setPrefix(parentPrefix(prefix))}
        />
      ) : null}

      {isEmpty ? (
        <div className="flex h-full items-center justify-center">
          <Empty description="This folder is empty" />
        </div>
      ) : (
        <div className="secondary-scrollbar grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-4 overflow-y-auto p-6 md:grid-cols-3">
          {level.folders.map((folder) => (
            <Tile
              key={folder.prefix}
              name={folder.name}
              caption={`${folder.fileCount} file${folder.fileCount === 1 ? '' : 's'}`}
              onOpen={() => setPrefix(folder.prefix)}
            >
              <FolderGlyph />
            </Tile>
          ))}

          {level.files.map((entry) => (
            <Tile
              key={entry.path}
              name={entry.name}
              caption={formatBytes(entry.size)}
              badge={fileExtension(entry.name) || undefined}
              onOpen={() => setOpenedEntry(entry)}
            >
              {entry.contentType && THUMBNAIL_CONTENT_TYPES.has(entry.contentType) ? (
                <ImageThumbnail entry={entry} file={file} context={context} />
              ) : (
                <FileGlyph />
              )}
            </Tile>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectoryBackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        title="Back"
        className={cn(
          'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full',
          'bg-primary-8 text-white transition-all duration-150',
          'hover:bg-primary-9 hover:shadow-md hover:ring-2 hover:ring-primary-8/25'
        )}
      >
        <RiArrowLeftSLine className="size-4" />
      </button>
      <span className="truncate text-sm font-bold text-primary-9" title={label}>
        {label}
      </span>
    </div>
  );
}

type TileProps = {
  name: string;
  caption: string;
  /** file format shown as a badge beside the name; folders have none */
  badge?: string;
  onOpen: () => void;
  children: ReactNode;
};

function Tile({ name, caption, badge, onOpen, children }: TileProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-2 rounded-lg border border-neutral-200 p-2 text-left transition-colors hover:border-primary-8"
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-neutral-1">
        {children}
      </div>
      <div className="min-w-0 w-full">
        <div className="flex items-start justify-between gap-2">
          {/* two lines of the name, the rest on hover: a figure's file name is usually longer than
              a tile is wide */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="line-clamp-2 text-sm break-all text-primary-9">{name}</span>
            </TooltipTrigger>
            <TooltipContent className="bg-white text-primary-9 shadow-md" arrowClassName="bg-white">
              {name}
            </TooltipContent>
          </Tooltip>
          {badge ? (
            <span className="shrink-0 rounded-full border border-gray-100 bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-primary-8">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-neutral-3">{caption}</div>
      </div>
    </button>
  );
}

function FolderGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-10 fill-none stroke-neutral-3"
      strokeWidth={1.5}
    >
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" />
    </svg>
  );
}

/** stands in for anything that has no thumbnail; the format itself is named by the tile's badge */
function FileGlyph() {
  return <FileIcon className="h-8 w-auto text-neutral-3" />;
}

type ImageThumbnailProps = {
  entry: TDirectoryFileEntry;
  file: TActivityCustomFile;
  context: WorkspaceContext;
};

function ImageThumbnail({ entry, file, context }: ImageThumbnailProps) {
  const { asset, entity } = file;
  const [failed, setFailed] = useState(false);

  const { data: url, isLoading } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityId: entity.id,
      assetId: asset.id,
      assetPath: entry.path,
      ...context,
    }),
    queryFn: async () => {
      const presigned = await getEntityCorePresignedUrl({
        entityType: entity.type as TEntityTypeDict,
        entityId: entity.id,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        configAssetId: asset.id,
        assetPath: entry.path,
      });
      return presigned.url;
    },
    staleTime: Infinity,
  });

  if (isLoading) return <Skeleton className="size-full rounded-none!" />;
  if (!url || failed) return <FileGlyph />;

  return (
    // biome-ignore lint/performance/noImgElement: presigned S3 urls are not next/image sources
    <img
      src={url}
      alt={entry.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('size-full object-contain transition-transform group-hover:scale-105')}
    />
  );
}
