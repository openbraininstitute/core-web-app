'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import Image from 'next/image';
import Link from 'next/link';

import { config } from '@/config';
import { startNotebook } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';

export function DataPreview() {
  const preview = useAtomValue(dataPreviewAtom);
  const { virtualLabId, projectId } = useWorkspace();

  const { mutate: launch, isPending } = useMutation({
    mutationFn: async () => {
      if (!preview || preview.kind !== 'notebook' || !preview.assetPath) return;
      const notebook = await startNotebook(
        preview.entityId,
        preview.assetPath,
        virtualLabId,
        projectId,
        preview.computeCell ?? 'aws',
        0
      );
      window.open(notebook.url, '_blank');
    },
  });

  if (!preview) return null;

  const dataHref = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(preview.extendedType)}/${preview.entityId}`;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-2">
        {preview.thumbnail ? (
          <Image
            fill
            unoptimized
            alt={preview.title}
            src={preview.thumbnail}
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2 px-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-primary-9 text-xl font-bold line-clamp-2" title={preview.title}>
            {preview.title}
          </h3>
          {preview.kind === 'data' ? (
            <Button asChild rounded variant="default" size="md" className="shrink-0">
              <Link href={dataHref}>View in Data</Link>
            </Button>
          ) : (
            <Button
              rounded
              variant="default"
              size="md"
              className="shrink-0"
              disabled={isPending || !preview.assetPath}
              onClick={() => launch()}
            >
              {isPending && <LoadingOutlined />}
              Launch notebook
            </Button>
          )}
        </div>
        <p className="text-neutral-4 line-clamp-5 text-sm leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
      </div>
    </div>
  );
}

export default DataPreview;
