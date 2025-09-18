import { Suspense } from 'react';
import { match } from 'ts-pattern';
import { useAtomValue } from 'jotai';

import { File } from '../simulation-files';
import { fileAtomFamily } from '../atoms';

import { EphysViewer } from '@/features/ephys-viewer';
import { classNames } from '@/util/utils';

import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import type { WorkspaceContext } from '@/types/common';

type FileViewerProps = {
  file?: File;
  context: WorkspaceContext;
  className?: string;
};

export function FileViewer({ file, context, className = '' }: FileViewerProps) {
  const fileName = file?.assetPath?.split('/').at(-1) ?? file?.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1)?.toLowerCase();

  const viewerContent = match(fileExt)
    .with(undefined, () => <p className="text-primary-8 text-lg">Select a file for preview</p>)
    .with('json', () => <JsonFileViewer file={file!} context={context} />)
    .with('nwb', () => <NwbFileViewer file={file!} context={context} />)
    .otherwise(() => <PlaceholderFileViewer file={file!} />);

  return (
    <div className={classNames('text-primary-9 relative rounded-2xl bg-white p-6', className)}>
      <div className="h-full overflow-auto p-6">
        <Suspense fallback={<div>Loading...</div>}>{viewerContent}</Suspense>
      </div>
    </div>
  );
}

type JsonFileViewerProps = {
  file: File;
  context: WorkspaceContext;
};

function JsonFileViewer({ file, context }: JsonFileViewerProps) {
  const parsedJson = useAtomValue(
    fileAtomFamily({
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
