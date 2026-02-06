import { useAtomValue } from 'jotai';
import { Suspense, useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { Loader } from '@/components/loader';
import { EphysViewer } from '@/features/ephys-viewer';
import type { WorkspaceContext } from '@/types/common';
import { cn } from '@/utils/css-class';
import { jsonFileAtomFamily } from '../atoms';
import type { File } from '../simulation-files';
import { CodeFileViewer } from './code-viewer';

type FileViewerProps = {
  file?: File;
  context: WorkspaceContext;
  loading?: boolean;
  className?: string;
};

export function FileViewer({ file, context, loading = false, className = '' }: FileViewerProps) {
  const [displayFile, setDisplayFile] = useState<File | undefined>(file);

  const isFilePreloading = file && file !== displayFile;

  const fileName =
    displayFile?.assetPath?.split('/').at(-1) ?? displayFile?.asset.path.split('/').at(-1);

  const fileExt = fileName?.split('.').at(-1)?.toLowerCase();

  const viewerContent = match(fileExt)
    .with(undefined, () => null)
    .with('json', () => <JsonFileViewer file={displayFile!} context={context} />)
    .with('nwb', () => <NwbFileViewer file={displayFile!} context={context} />)
    .otherwise(() => <PlaceholderFileViewer file={displayFile!} />);

  return (
    <div
      className={cn('text-primary-9 relative rounded-2xl bg-white p-6', className, {
        'p-0': fileExt === 'json',
      })}
    >
      <div className={cn('relative h-full overflow-auto p-6', { 'p-0': fileExt === 'json' })}>
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
  file: File;
  context: WorkspaceContext;
  onLoaded: () => void;
};

function FilePreloader({ file, context, onLoaded }: FilePreloaderProps) {
  const fileName = file?.assetPath?.split('/').at(-1) ?? file?.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1)?.toLowerCase();

  const needsPreloading = fileExt === 'json';

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
  file: File;
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
  file: File;
  context: WorkspaceContext;
};

function NwbFileViewer({ file, context }: NwbFileViewerProps) {
  const { entity } = file;
  return (
    <EphysViewer key={entity.id} resource={entity as ICircuitSimulationResult} ctx={context} />
  );
}

type PlaceholderFileViewerProps = {
  file: File;
};

function PlaceholderFileViewer({ file }: PlaceholderFileViewerProps) {
  const fileName = file?.assetPath?.split('/').at(-1) ?? file?.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1)?.toLowerCase();

  return (
    <div className="flex h-full items-center justify-center">
      <span>
        Preview for <span className="uppercase">{fileExt}</span> files is not supported yet
      </span>
    </div>
  );
}
