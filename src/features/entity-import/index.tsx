'use client';

import { useEntityImportController } from '@/features/entity-import/hooks/use-entity-import-controller';
import { ImportShell } from '@/features/entity-import/ui/import-shell';

import type {
  IEntityImportAdapter,
  IEntityImportRuntimeContext,
} from '@/features/entity-import/core/adapter';
import type { TFlatImportValues } from '@/features/entity-import/core/contracts';

interface EntityImportFeatureProps<TPayload, TResult> {
  title: string | null;
  adapter: IEntityImportAdapter<TPayload, TResult>;
  context: IEntityImportRuntimeContext;
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
      importRun={controller.importRun}
      validatorPreview={controller.validatorPreview}
      csvUploadPhase={controller.csvUploadPhase}
      csvRowValidationProgress={controller.csvRowValidationProgress}
      csvUploadNotifications={controller.csvUploadNotifications}
      validatorSuggestions={controller.validatorSuggestions}
      fieldStatusMap={controller.fieldStatusMap}
      rowsSummaryStatus={controller.rowsSummaryStatus}
      onDismissCsvUploadNotifications={controller.onDismissCsvUploadNotifications}
      onDownloadCsvTemplate={controller.onDownloadCsvTemplate}
      onDownloadCurrentCsv={controller.onDownloadCurrentCsv}
      onDownloadGuideTemplate={controller.onDownloadGuideTemplate}
      onUploadCsvFile={controller.onHandleCsvUpload}
      onClose={onClose}
    />
  );
}

export {
  createCellMorphologyImportAdapter,
  createElectricalCellRecordingImportAdapter,
} from '@/ui/segments/contribute/multiple';

export type {
  IEntityImportAdapter,
  IEntityImportRuntimeContext,
} from '@/features/entity-import/core/adapter';
