import { useAtomValue } from 'jotai';
import { Suspense, useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';

import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { Loader } from '@/components/loader';
import { EphysViewer } from '@/features/ephys-viewer';
import { SonataViewer } from '@/features/sonata-viewer';
import { SpikeViewer } from '@/features/spike-viewer';
import { cn } from '@/utils/css-class';

import { jsonFileAtomFamily } from '../atoms';
import { CodeFileViewer } from './code-viewer';
import { ImageFileViewer } from './image-viewer';

import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

type FileViewerProps = {
  file?: TActivityCustomFile;
  context: WorkspaceContext;
  loading?: boolean;
  className?: string;
};

const IMAGE_CONTENT_TYPES = new Set([
  AssetContentType.png,
  AssetContentType.jpeg,
  AssetContentType.webp,
]);

function isImageFile(file: TActivityCustomFile): boolean {
  return IMAGE_CONTENT_TYPES.has(file.asset.content_type);
}

export function FileViewer({ file, context, loading = false, className = '' }: FileViewerProps) {
  const [displayFile, setDisplayFile] = useState<TActivityCustomFile | undefined>(file);

  const isFilePreloading = file && file !== displayFile;

  const isJson =
    displayFile?.asset.content_type === AssetContentType.json ||
    file?.enforcedRenderType === AssetContentType.json;
  const isImage = !!displayFile && isImageFile(displayFile);
  const edgeToEdge = isJson || isImage;

  const viewerContent = match(displayFile)
    .with(undefined, () => null)
    .with(
      P.when(
        (f) =>
          f.asset.content_type === AssetContentType.json ||
          f.enforcedRenderType === AssetContentType.json
      ),
      (f) => <JsonFileViewer file={f} context={context} />
    )
    .with(P.when(isImageFile), (f) => <ImageFileViewer file={f} context={context} />)
    .with({ asset: { content_type: AssetContentType.nwb } }, (f) => (
      <NwbFileViewer file={f} context={context} />
    ))
    .with({ asset: { content_type: AssetContentType.h5, label: AssetLabel.spike_report } }, (f) => (
      <H5SpikeFileViewer file={f} context={context} />
    ))
    .with(
      { asset: { content_type: AssetContentType.h5, label: AssetLabel.replay_spikes } },
      (f) => <H5SpikeFileViewer file={f} context={context} />
    )
    .with(
      { asset: { content_type: AssetContentType.h5, label: AssetLabel.voltage_report } },
      (f) => <H5SonataFileViewer file={f} context={context} />
    )
    .otherwise((f) => <PlaceholderFileViewer file={f} />);

  return (
    <div
      className={cn('text-primary-9 relative rounded-2xl bg-white p-6 w-full', className, {
        'p-0': edgeToEdge,
      })}
    >
      <div className={cn('relative h-full overflow-auto p-6', { 'p-0': edgeToEdge })}>
        <Suspense>{viewerContent}</Suspense>
        {loading && !isFilePreloading && (
          <div className="absolute inset-0 z-10 flex h-full cursor-progress items-center justify-center rounded-2xl backdrop-blur-xs">
            <Loader className="text-neutral-3" />
          </div>
        )}
        {isFilePreloading && file && (
          <div className="absolute inset-0 z-10 cursor-progress">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center rounded-2xl backdrop-blur-xs">
                  <Loader className="text-neutral-3" />
                </div>
              }
            >
              <FilePreloader file={file} context={context} onLoaded={() => setDisplayFile(file)} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

type FilePreloaderProps = {
  file: TActivityCustomFile;
  context: WorkspaceContext;
  onLoaded: () => void;
};

function FilePreloader({ file, context, onLoaded }: FilePreloaderProps) {
  const needsPreloading = file.asset.content_type === AssetContentType.json;

  useEffect(() => {
    if (!needsPreloading) {
      onLoaded();
    }
  }, [needsPreloading, onLoaded]);

  if (!needsPreloading) {
    return null;
  }

  return <DataPreloader file={file} context={context} onLoaded={onLoaded} />;
}

function DataPreloader({ file, context, onLoaded }: FilePreloaderProps) {
  useAtomValue(
    jsonFileAtomFamily({
      id: file.asset.id,
      entityId: file.entity.id,
      entityType: file.entity.type,
      assetPath: file.assetPath,
      context,
    })
  );

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  return null;
}

type JsonFileViewerProps = {
  file: TActivityCustomFile;
  context: WorkspaceContext;
};

function JsonFileViewer({ file, context }: JsonFileViewerProps) {
  return (
    <CodeFileViewer
      asset={file.asset}
      assetPath={file.assetPath}
      entity={file.entity}
      context={context}
    />
  );
}

type NwbFileViewerProps = {
  file: TActivityCustomFile;
  context: WorkspaceContext;
};

function NwbFileViewer({ file, context }: NwbFileViewerProps) {
  const { entity, asset } = file;
  return (
    <EphysViewer
      key={asset.id}
      entity={entity as ISimulationResult}
      assetId={asset.id}
      ctx={context}
    />
  );
}

type H5FileViewerProps = {
  file: TActivityCustomFile;
  context: WorkspaceContext;
};

function H5SpikeFileViewer({ file, context }: H5FileViewerProps) {
  const { entity, asset } = file;
  return (
    <SpikeViewer
      key={`${entity.id}-${asset.id}`}
      entityId={entity.id}
      entityType={entity.type}
      asset={asset}
      ctx={context}
    />
  );
}

function H5SonataFileViewer({ file, context }: H5FileViewerProps) {
  const { entity, asset } = file;
  return (
    <SonataViewer
      key={`${entity.id}-${asset.id}`}
      entity={entity as ISimulationResult}
      assetId={asset.id}
      ctx={context}
    />
  );
}

type PlaceholderFileViewerProps = {
  file: TActivityCustomFile;
};

function PlaceholderFileViewer({ file }: PlaceholderFileViewerProps) {
  const fileExt = (file?.assetPath ?? file.asset.path).split('.').at(-1)?.toLowerCase();

  return (
    <div className="flex h-full items-center justify-center">
      <span>
        Preview for <span className="uppercase">{fileExt}</span> files is not supported yet
      </span>
    </div>
  );
}
