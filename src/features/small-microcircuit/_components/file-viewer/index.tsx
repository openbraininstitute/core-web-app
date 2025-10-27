import { Suspense, useState, useEffect } from 'react';
import { match } from 'ts-pattern';
import { useAtomValue } from 'jotai';

import { File } from '../simulation-files';
import { jsonFileAtomFamily } from '../atoms';

import { EphysViewer } from '@/features/ephys-viewer';
import { classNames } from '@/util/utils';
import Loader from '@/components/loader';

import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import type { WorkspaceContext } from '@/types/common';

type FileViewerProps = {
  file?: File;
  context: WorkspaceContext;
  className?: string;
};

export function FileViewer({ file, context, className = '' }: FileViewerProps) {
  const [displayFile, setDisplayFile] = useState<File | undefined>(file);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (file && file !== displayFile) {
      setIsLoading(true);
    } else if (!file) {
      setDisplayFile(undefined);
      setIsLoading(false);
    }
  }, [file, displayFile]);

  const fileName =
    displayFile?.assetPath?.split('/').at(-1) ?? displayFile?.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1)?.toLowerCase();

  const viewerContent = match(fileExt)
    .with(undefined, () => null)
    .with('json', () => <JsonFileViewer file={displayFile!} context={context} />)
    .with('nwb', () => <NwbFileViewer file={displayFile!} context={context} />)
    .otherwise(() => <PlaceholderFileViewer file={displayFile!} />);

  return (
    <div className={classNames('text-primary-9 relative rounded-2xl bg-white p-6', className)}>
      <div className="relative h-full overflow-auto p-6">
        <Suspense>{viewerContent}</Suspense>
        {isLoading && file && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center rounded-2xl backdrop-blur-xs">
                  <Loader className="text-neutral-3" />
                </div>
              }
            >
              <FilePreloader
                file={file}
                context={context}
                onLoaded={() => {
                  setDisplayFile(file);
                  setIsLoading(false);
                }}
              />
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
  const parsedJson = useAtomValue(
    jsonFileAtomFamily({
      id: file.asset.id,
      entityId: file.entity.id,
      entityType: file.entity.type,
      assetPath: file.assetPath,
      context,
    })
  );

  return <pre>{JSON.stringify(parsedJson, null, 2)}</pre>;
}

type NwbFileViewerProps = {
  file: File;
  context: WorkspaceContext;
};

function NwbFileViewer({ file, context }: NwbFileViewerProps) {
  return <EphysViewer resource={file.entity as ICircuitSimulationResult} ctx={context} />;
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
