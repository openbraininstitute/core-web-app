'use client';

import { useEntityImportController } from './hooks/use-entity-import-controller';
import { ImportShell } from './ui/import-shell';

import type { EntityImportAdapter, EntityImportRuntimeContext } from './core/adapter';
import type { FlatImportValues } from './core/contracts';

interface EntityImportFeatureProps<TPayload, TResult> {
  title: string | null;
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  initialRows?: Array<FlatImportValues>;
  onClose: () => void;
}

export function EntityImportFeature<TPayload, TResult>({
  title,
  adapter,
  context,
  initialRows,
  onClose,
}: EntityImportFeatureProps<TPayload, TResult>) {
  const controller = useEntityImportController({
    adapter,
    context,
    initialRows,
  });

  return (
    <ImportShell
      title={title}
      adapter={adapter}
      context={context}
      session={controller.session}
      actions={controller.actions}
      isSubmitting={controller.isSubmitting}
      onDownloadTemplate={controller.downloadTemplate}
      onUploadCsvFile={controller.handleCsvUpload}
      onClose={onClose}
    />
  );
}

export { createCellMorphologyImportAdapter } from './adapters/cell-morphology/adapter';

export type { EntityImportAdapter, EntityImportRuntimeContext } from './core/adapter';
