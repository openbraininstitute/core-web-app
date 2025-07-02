import { classNames } from '@/util/utils';
import { Suspense } from 'react';
import { match } from 'ts-pattern';
import { WorkspaceContext } from '@/types/common';
import { File } from '../simulation-files';
import { useAtomValue } from 'jotai';
import { JsonFileViewerProps, PlaceholderFileViewerProps } from '.';
import { fileAtomFamily } from '../atoms';

export function FileViewer({ file, context, className = '' }: FileViewerProps) {
  const fileName = file?.assetPath?.split('/').at(-1) ?? file?.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1)?.toLowerCase();

  const viewerContent = match(fileExt)
    .with(undefined, () => <p className="text-primary-3 text-lg">Select a file for preview</p>)
    .with('json', () => <JsonFileViewer file={file!} context={context} />)
    .otherwise(() => <PlaceholderFileViewer file={file!} />);

  return (
    <div
      className={classNames(
        'overflow-scroll rounded-2xl bg-[linear-gradient(338.27deg,_#002766_58.71%,_#004ECC_128.93%)] p-12 text-white',
        className
      )}
    >
      <Suspense fallback={<div>Loading...</div>}>{viewerContent}</Suspense>
    </div>
  );
}
export type FileViewerProps = {
  file?: File;
  context: WorkspaceContext;
  className?: string;
};
export type JsonFileViewerProps = {
  file: File;
  context: WorkspaceContext;
};
export function JsonFileViewer({ file, context }: JsonFileViewerProps) {
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
export type PlaceholderFileViewerProps = {
  file: File;
};
export function PlaceholderFileViewer({ file }: PlaceholderFileViewerProps) {
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
