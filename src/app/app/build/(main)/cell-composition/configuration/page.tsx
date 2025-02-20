'use client';

import { useCallback, useState, useMemo, ChangeEvent, ReactNode, Suspense } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { validator } from '@exodus/schemasafe';
import { Button, Image } from 'antd';
import * as Tabs from '@radix-ui/react-tabs';
import { ErrorBoundary } from 'react-error-boundary';
import FileSaver from 'file-saver';
import schema from './schema.json';
import DensityChart from './DensityChart';
import TopNavigation from '@/components/TopNavigation';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { densityOrCountAtom, selectedBrainRegionAtom } from '@/state/brain-regions';
import { ResetIcon, UndoIcon } from '@/components/icons';
import { basePath } from '@/config';
import { switchStateType } from '@/util/common';
import useCompositionHistory from '@/app/app/build/(main)/cell-composition/configuration/use-composition-history';
import { analysedCompositionAtom, compositionAtom } from '@/state/build-composition';
import { configPayloadAtom } from '@/state/brain-model-config/cell-composition';
import { setCompositionPayloadConfigurationAtom } from '@/state/brain-model-config/cell-composition/extra';
import { isConfigEditableAtom } from '@/state/brain-model-config';
import { OriginalCompositionUnit } from '@/types/composition/original';
import useLiteratureCleanNavigate from '@/components/explore-section/Literature/useLiteratureCleanNavigate';
import { Btn, FileInputBtn } from '@/components/Btn';
import useNotification from '@/hooks/notifications';

function CellPosition() {
  return (
    <Image
      src={`${basePath}/images/build/BBM_ComingSoon_221119.png`} // TODO: Fix this
      alt="Coming soon"
      className="object-contain"
    />
  );
}

function CellDistribution() {
  return (
    <Image
      src={`${basePath}/images/build/BBM_Distribution_V1_221119.png`} // TODO: Fix this
      alt="Coming soon"
      className="object-contain"
    />
  );
}

interface CellDensityToolbarButtonItem {
  key: string;
  children: ReactNode;
  icon?: ReactNode;
  isDisabled?: boolean;
  callback: () => void;
}

interface CellDensityToolbarProps {
  onReset: () => void;
}

function CellDensityToolbar({ onReset }: CellDensityToolbarProps) {
  const [densityOrCount, setDensityOrCount] = useAtom(densityOrCountAtom);
  const isConfigEditable = useAtomValue(isConfigEditableAtom);
  const { undoComposition, redoComposition, canUndo, canRedo } = useCompositionHistory();

  const toggleDensityAndCount = useCallback(
    () =>
      setDensityOrCount((prev) => {
        const nextState =
          prev === switchStateType.DENSITY ? switchStateType.COUNT : switchStateType.DENSITY;
        return nextState as keyof OriginalCompositionUnit;
      }),
    [setDensityOrCount]
  );

  const densityOrCountDisplay = useMemo(
    () => (densityOrCount === switchStateType.DENSITY ? 'Densities [/mm³]' : 'Counts [N]'),
    [densityOrCount]
  );

  const handleUndo = useCallback(() => {
    undoComposition();
  }, [undoComposition]);

  const handleRedo = useCallback(() => {
    redoComposition();
  }, [redoComposition]);

  const items: CellDensityToolbarButtonItem[] = [
    {
      key: switchStateType.DENSITY,
      children: densityOrCountDisplay,
      callback: toggleDensityAndCount,
    },
    {
      key: 'percentage',
      children: 'Percentage',
      isDisabled: true,
      callback: () => {
        console.warn('Not implemented yet'); // eslint-disable-line no-console
      },
    },
    {
      icon: <UndoIcon />,
      key: 'undo',
      children: `Undo`,
      isDisabled: !canUndo,
      callback: handleUndo,
    },
    {
      icon: <UndoIcon style={{ transform: 'scaleX(-1)' }} />,
      key: 'redo',
      children: `Redo`,
      isDisabled: !canRedo,
      callback: handleRedo,
    },
    {
      icon: <ResetIcon />,
      key: 'reset',
      children: `Reset`,
      isDisabled: !canUndo,
      callback: onReset,
    },
  ];

  return (
    !!isConfigEditable && (
      <div className="flex justify-end gap-2">
        {items.map(({ icon, key, children, callback, isDisabled }) => (
          <Button
            className="flex items-center gap-2 text-sm"
            icon={icon}
            key={key}
            type="text"
            disabled={isDisabled ?? false}
            onClick={callback}
          >
            {children}
          </Button>
        ))}
      </div>
    )
  );
}

function CellDensity() {
  const brainRegion = useAtomValue(selectedBrainRegionAtom);
  const analysedComposition = useAtomValue(analysedCompositionAtom);
  const composition = useAtomValue(compositionAtom);
  const compositionExport = useAtomValue(useMemo(() => unwrap(configPayloadAtom), []));
  const setCompositionFromUpload = useSetAtom(setCompositionPayloadConfigurationAtom);

  const { resetComposition } = useCompositionHistory();

  // This should be treated as a temporary solution
  // as we shouldn't expect empty composition in the end.
  if (!analysedComposition && brainRegion) {
    throw new Error(`There is no configuration data for the ${brainRegion?.title}`);
  }

  const handleReset = useCallback(() => {
    resetComposition();
  }, [resetComposition]);

  const [uploading, setUploading] = useState(false);

  const validate = useMemo(() => validator(schema), []);

  const notify = useNotification();

  const isConfigEditable = useAtomValue(isConfigEditableAtom);

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    setUploading(true);

    const { files } = event.target;
    const newComposition = files?.[0];
    const fileContent = await newComposition?.text();
    const parsedFileContent = fileContent && JSON.parse(fileContent);

    if (validate(parsedFileContent)) {
      setCompositionFromUpload(parsedFileContent);
      notify.success('The composition has been successfully updated.');
    } else {
      notify.error(
        'The provided JSON did not match the format of the cell composition configuration.'
      );
    }

    setUploading(false);
  };

  const onClickExport = () => {
    FileSaver.saveAs(
      new Blob([JSON.stringify(compositionExport)], { type: 'text/plain;charset=utf-8' }),
      'cell-composition.json',
      false
    );
  };

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent} resetKeys={[composition]}>
      <DensityChart />
      <div className="flex w-full items-center justify-between">
        <CellDensityToolbar onReset={handleReset} />
        <div className="sticky bottom-0 flex gap-2">
          {isConfigEditable && (
            <FileInputBtn
              accept="application/json"
              className="bg-primary-7"
              onChange={onUpload}
              loading={uploading}
            >
              <strong>Import</strong> Composition Config
            </FileInputBtn>
          )}
          <Btn className="bg-primary-8" onClick={onClickExport}>
            <strong>Export</strong> Composition Config
          </Btn>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function ConfigurationView() {
  const [activeTab, setActiveTab] = useState('density');

  const tabItems = [
    {
      id: 'density',
      label: 'Density',
      onClick: () => setActiveTab('density'),
    },
    {
      id: 'distribution',
      label: 'Distribution',
      onClick: () => setActiveTab('distribution'),
    },
    {
      id: 'position',
      label: 'Position',
      onClick: () => setActiveTab('position'),
    },
  ];

  const tabContent = useMemo(
    () =>
      [
        {
          children: (
            <Suspense fallback={null}>
              <CellDensity />
            </Suspense>
          ),
          value: 'density',
        },
        { children: <CellDistribution />, value: 'distribution' },
        { children: <CellPosition />, value: 'position' },
      ].map(({ children, value }) => (
        <Tabs.Content className="flex h-full flex-col gap-5" key={value} value={value}>
          {children}
        </Tabs.Content>
      )),
    []
  );

  useLiteratureCleanNavigate();

  return (
    <Tabs.Root value={activeTab} className="h-full overflow-hidden px-4 py-4">
      <TopNavigation.PillNav
        items={tabItems}
        activeItemIndex={tabItems.findIndex(({ id }) => id === activeTab)}
      />
      {tabContent}
    </Tabs.Root>
  );
}
