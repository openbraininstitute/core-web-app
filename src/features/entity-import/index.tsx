'use client';

import { useEntityImportController } from '@/features/entity-import/hooks/use-entity-import-controller';
import { ImportShell } from '@/features/entity-import/ui/import-shell';

import type {
  EntityImportRuntimeContext,
  IEntityImportAdapter,
} from '@/features/entity-import/core/adapter';
import type { TFlatImportValues } from '@/features/entity-import/core/contracts';

interface EntityImportFeatureProps<TPayload, TResult> {
  title: string | null;
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: EntityImportRuntimeContext;
  initialRows?: Array<TFlatImportValues>;
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
      csvUploadPhase={controller.csvUploadPhase}
      csvRowValidationProgress={controller.csvRowValidationProgress}
      csvUploadNotifications={controller.csvUploadNotifications}
      validatorSuggestions={controller.validatorSuggestions}
      onDismissCsvUploadNotifications={controller.dismissCsvUploadNotifications}
      onDownloadCsvTemplate={controller.downloadCsvTemplate}
      onDownloadCurrentCsv={controller.downloadCurrentCsv}
      onDownloadGuideTemplate={controller.downloadGuideTemplate}
      onUploadCsvFile={controller.handleCsvUpload}
      onClose={onClose}
    />
  );
}

export { createCellMorphologyImportAdapter } from '@/features/entity-import/adapters/cell-morphology/adapter';

export type {
  EntityImportRuntimeContext,
  IEntityImportAdapter as EntityImportAdapter,
} from '@/features/entity-import/core/adapter';
