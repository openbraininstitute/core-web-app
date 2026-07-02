'use client';

import { LoadingOutlined } from '@ant-design/icons';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import { useNotebookContent } from '../hooks/use-notebook-content';
import { NotebookRenderer } from './notebook-renderer';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';

type NotebookEntityLike = {
  id: string;
  type: TEntityTypeDict;
  assets: IAsset[];
};

const PREVIEW_CELL_COUNT = 8;

function EmptyState({ message }: { message: string }) {
  return (
    <div
      data-testid="notebook-viewer-empty"
      className="flex h-40 items-center justify-center rounded-xl bg-white text-sm text-neutral-500"
    >
      {message}
    </div>
  );
}

function LoadingState() {
  return (
    <div
      data-testid="notebook-viewer-loading"
      className="flex h-40 items-center justify-center rounded-xl bg-white text-neutral-500"
    >
      <LoadingOutlined className="text-2xl" />
    </div>
  );
}

export function NotebookViewer({ record }: { record: NotebookEntityLike }) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data, isLoading, isError, hasAsset } = useNotebookContent({
    entityType: record.type,
    entityId: record.id,
    assets: record.assets,
    ctx: { virtualLabId, projectId },
  });

  if (!hasAsset) return <EmptyState message="This notebook has no content to display." />;
  if (isLoading) return <LoadingState />;
  if (isError || !data?.cells?.length) {
    return <EmptyState message="Unable to load the notebook content." />;
  }

  return (
    <div data-testid="notebook-viewer" className="rounded-xl bg-white p-6 text-neutral-900">
      <NotebookRenderer ipynb={data} />
    </div>
  );
}

/**
 * compact preview used inside the mini-detail drawer; height-capped and scrollable
 */
export function NotebookCellsPreview({
  record,
  className,
}: {
  record: NotebookEntityLike;
  className?: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data, isLoading, isError, hasAsset } = useNotebookContent({
    entityType: record.type,
    entityId: record.id,
    assets: record.assets,
    ctx: { virtualLabId, projectId },
  });

  if (!hasAsset || isError || (!isLoading && !data?.cells?.length)) return null;

  return (
    <div
      data-testid="notebook-cells-preview"
      className={cn(
        'primary-scrollbar mt-5 max-h-80 overflow-auto rounded-md bg-white p-4 text-neutral-900',
        className
      )}
    >
      {isLoading || !data ? (
        <div className="flex h-32 items-center justify-center text-neutral-400">
          <LoadingOutlined className="text-xl" />
        </div>
      ) : (
        // cap the preview so opening the drawer doesn't render an entire notebook,
        // and drop cell outputs so the preview shows source only
        <NotebookRenderer
          ipynb={{
            ...data,
            cells: data.cells.slice(0, PREVIEW_CELL_COUNT).map((cell) => ({
              ...cell,
              outputs: [],
              execution_count: null,
            })),
          }}
        />
      )}
    </div>
  );
}
