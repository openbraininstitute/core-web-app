'use client';

import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';

import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

export function WorkflowConfigFile({
  config,
  asset,
  context,
}: {
  config: ITaskConfig<Record<string, unknown>>;
  asset: IAsset;
  context: WorkspaceContext;
}) {
  return (
    <FileViewer
      className="h-[70vh] min-h-96 border border-neutral-2"
      context={context}
      file={{ id: asset.id, entity: config, asset, renderer: ActivityCustomFileRenderer.Default }}
    />
  );
}
