import { useQuery } from '@tanstack/react-query';
import { NodeViewWrapper } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';

import {
  fileBlobQuery,
  findLogFile,
  logFilesQuery,
  shortPathOf,
} from '@/features/logbook/api/log-files';
import { useLogContext } from '@/features/logbook/log/context';
import { useUploading } from '@/features/logbook/log/uploads';
import { Icon } from '@/features/logbook/ui/icons';
import { useObjectUrl } from '@/hooks/use-object-url';

import type { NodeViewProps } from '@tiptap/react';
import type { ILogFile } from '@/features/logbook/api/log-files';

const IMG = 'mx-auto block max-w-full';

function Picture({
  folderId,
  file,
  alt,
}: {
  readonly folderId: string;
  readonly file: ILogFile;
  readonly alt: string;
}) {
  const { project, logId } = useLogContext();
  const image = useQuery(fileBlobQuery(logId, folderId, file.path, project));
  const src = useObjectUrl(image.data);
  if (isNil(src)) return null;
  return <img className={IMG} src={src} alt={alt} loading="lazy" />;
}

export function FigureView({ node, selected }: NodeViewProps) {
  const { project, logId } = useLogContext();
  const src = String(node.attrs['src']);
  const alt = String(node.attrs['alt']);
  const files = useQuery(logFilesQuery(logId, project));
  const folderId = files.data?.folderId ?? null;
  const file = isNil(files.data) ? null : findLogFile(files.data.files, src);
  const external = /^https?:\/\//.test(src);
  const uploading = useUploading(src);

  return (
    <NodeViewWrapper
      as="figure"
      className="mx-0 mt-3 mb-4 overflow-hidden rounded-2xl border border-block-border bg-white"
      data-selected={selected}
      contentEditable={false}
    >
      {external ? (
        <img className={IMG} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />
      ) : isNotNil(file) && isNotNil(folderId) ? (
        <Picture folderId={folderId} file={file} alt={alt} />
      ) : (
        <div className="flex h-[180px] flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(45deg,#f5f8fc_0_10px,#eef2f7_10px_20px)] [font:13px_var(--font-mono)] text-neutral-4">
          <Icon name="image" size={26} />
          <span>{uploading ? `Uploading ${shortPathOf(src)}…` : shortPathOf(src)}</span>
        </div>
      )}
      <figcaption className="flex justify-between gap-3 border-t border-rule-soft px-[14px] py-[10px] text-[13px] text-neutral-4">
        <span>{alt}</span>
        <code className="bg-transparent p-0 [font:12px_var(--font-mono)]">{shortPathOf(src)}</code>
      </figcaption>
    </NodeViewWrapper>
  );
}
