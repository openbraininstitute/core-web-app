'use client';

import { kebabCase } from 'es-toolkit/compat';
import { parseAsString, type SingleParserBuilder, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';

import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  downloadImportCsvTemplate,
  resolveContributeMultipleImportAdapter,
  tryDownloadImportGuide,
} from '@/features/entity-import/lib/download-import-artifacts';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  buildContributionArtifactOptions,
  ImportLeftSideTab,
  ImportMode,
  ImportOptionsScreen,
  SelectTypeScreen,
  type TImportLeftSideTab,
  type TImportMode,
  UploadFlowSidebar,
} from '@/ui/segments/contribute/flow-elements';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export default function Page() {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();

  const options = useMemo(() => buildContributionArtifactOptions(), []);
  const [{ mode, type, view, step }, onStateChange] = useQueryStates(
    {
      mode: parseAsString
        .withOptions({
          clearOnDefault: true,
          shallow: true,
        })
        .withDefault(ImportMode.Single) as SingleParserBuilder<TImportMode>,
      type: parseAsString.withOptions({
        clearOnDefault: false,
        shallow: true,
      }) as SingleParserBuilder<TExtendedEntitiesTypeDict>,
      view: parseAsString.withOptions({
        clearOnDefault: true,
        shallow: true,
      }),
      step: parseAsString
        .withOptions({
          clearOnDefault: true,
          shallow: true,
        })
        .withDefault(ImportLeftSideTab.Type) as SingleParserBuilder<TImportLeftSideTab>,
    },
    {
      urlKeys: {
        mode: 'm',
        type: 't',
        view: 'v',
        step: 's',
      },
    }
  );
  const currentTab = step ?? ImportLeftSideTab.Type;

  const setCurrentTab = useCallback(
    (nextTab: TImportLeftSideTab) => {
      if (nextTab === currentTab) {
        return;
      }
      onStateChange({ step: nextTab });
    },
    [currentTab, onStateChange]
  );

  const isTypeMenuActive = currentTab === ImportLeftSideTab.Type;
  const isOptionsMenuActive = currentTab === ImportLeftSideTab.Options;
  const selectedType = getEntityByExtendedType({ type: type ?? undefined });

  const effectiveImportMode = useMemo((): TImportMode => {
    if (
      selectedType &&
      selectedType.isMultipleContributeSupport !== true &&
      mode === ImportMode.Multiple
    ) {
      return ImportMode.Single;
    }
    return mode ?? ImportMode.Single;
  }, [selectedType, mode]);

  useEffect(() => {
    if (!selectedType) {
      return;
    }
    if (selectedType.isMultipleContributeSupport === true) {
      return;
    }
    if (mode !== ImportMode.Multiple) {
      return;
    }
    onStateChange({
      mode: ImportMode.Single,
      type: selectedType.extendedType,
    });
  }, [selectedType, mode, onStateChange]);

  useEffect(() => {
    if (view !== 'options' || type == null) {
      return;
    }
    onStateChange({
      step: ImportLeftSideTab.Options,
      view: null,
    });
  }, [view, type, onStateChange]);

  const onTypeSelect = (nextType: TExtendedEntitiesTypeDict) => {
    const selected = options.find((option) => option.value === nextType);
    onStateChange({
      mode: null,
      step: ImportLeftSideTab.Options,
      type: selected?.value,
    });
  };

  const continueHref = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/contribute/${effectiveImportMode}/${kebabCase(selectedType?.extendedType ?? '')}`;

  const multipleDownloadsDisabled = type == null;

  const handleMultipleDownloadTemplate = useCallback(() => {
    if (type == null) {
      return;
    }
    const adapter = resolveContributeMultipleImportAdapter(type);
    if (adapter) {
      downloadImportCsvTemplate(adapter);
    }
  }, [type]);

  const handleMultipleDownloadGuide = useCallback(() => {
    if (type == null) {
      return;
    }
    const adapter = resolveContributeMultipleImportAdapter(type);
    if (!adapter) {
      return;
    }
    if (!tryDownloadImportGuide(adapter)) {
      notification.error({
        message: 'Guide unavailable',
        description: 'No import guide is available for this artifact type.',
      });
    }
  }, [notification, type]);

  return (
    <div className="bg-background border-neutral-2 mx-2 ml-3 h-full w-[calc(100%-10px)] gap-4 overflow-hidden rounded-2xl border p-2 [grid-area:main]">
      <div className="grid h-full w-full grid-cols-[25rem_auto] gap-3">
        <div className="min-h-0 min-w-0 overflow-y-auto">
          <UploadFlowSidebar
            currentTab={currentTab}
            hasTypeSelected={type !== null}
            mode={effectiveImportMode}
            onTabChange={setCurrentTab}
            onMultipleDownloadGuide={handleMultipleDownloadGuide}
            onMultipleDownloadTemplate={handleMultipleDownloadTemplate}
            multipleImportDownloadsDisabled={multipleDownloadsDisabled}
          />
        </div>
        {isTypeMenuActive && (
          <SelectTypeScreen
            workspace={{ virtualLabId, projectId }}
            options={options}
            selectedType={type}
            onSelectType={onTypeSelect}
          />
        )}
        {isOptionsMenuActive && selectedType ? (
          <ImportOptionsScreen
            workspace={{ virtualLabId, projectId }}
            selectedType={selectedType}
            mode={effectiveImportMode}
            onModeChange={(nextMode) => {
              onStateChange({
                mode: nextMode,
                type: selectedType.extendedType,
              });
            }}
            onUploadBreadcrumbClick={() => {
              onStateChange({
                mode: null,
                step: ImportLeftSideTab.Type,
                type: null,
              });
            }}
            continueHref={continueHref}
          />
        ) : null}
      </div>
    </div>
  );
}
