'use client';

import { useEntityImportController } from './hooks/use-entity-import-controller';
import { ImportShell } from './ui/import-shell';

import type { EntityImportAdapter, EntityImportRuntimeContext } from './core/adapter';
import type { FlatImportValues } from './core/contracts';

interface EntityImportFeatureProps<TPayload, TResult> {
  adapter: EntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  initialRows?: Array<FlatImportValues>;
}

export function EntityImportFeature<TPayload, TResult>({
  adapter,
  context,
  initialRows,
}: EntityImportFeatureProps<TPayload, TResult>) {
  const controller = useEntityImportController({
    adapter,
    context,
    initialRows,
  });

  return (
    <ImportShell
      adapter={adapter}
      context={context}
      session={controller.session}
      actions={controller.actions}
      isSubmitting={controller.isSubmitting}
      onDownloadTemplate={controller.downloadTemplate}
      onUploadCsvFile={controller.handleCsvUpload}
    />
  );
}

export { createCellMorphologyImportAdapter } from './adapters/cell-morphology/adapter';

export type { EntityImportAdapter, EntityImportRuntimeContext } from './core/adapter';
