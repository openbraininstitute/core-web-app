'use client';

import { Empty } from 'antd';
import { useMemo, useState } from 'react';

import {
  EphysOptionSelect,
  EphysViewer,
  EphysViewerSkeleton,
  TraceViewMode,
} from '@/features/ephys-viewer';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import {
  ELECTRICAL_CELL_RECORDING_FROM_ID,
  extractRecordingIds,
} from '@/features/scan-config/components/hooks/electrical-cell-recording-properties';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  MotionTabs,
  MotionTabsContent,
  MotionTabsList,
  MotionTabsTrigger,
} from '@/ui/molecules/motion-tabs';
import { Skeleton } from '@/ui/molecules/skeleton';

import { type TEFelFigure, useEFelFigures } from './efel-figures';
import { EFeatureFigure } from './feature-figure';

import type { IElectricalCellRecording } from '@/api/entitycore/types';
import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

/**
 * One eFEL illustration.
 *
 * Captioned by its file name because that is all the directory gives us — each figure covers a
 * family of features (`AHP.png` for every AHP measure), so there is no single feature whose
 * label or description belongs here.
 */
function FeatureFigureCard({ figure }: { figure: TEFelFigure }) {
  return (
    <figure className="border-neutral-2 flex flex-col gap-1 rounded border p-2">
      <figcaption className="text-primary-9 text-sm font-semibold">{figure.label}</figcaption>
      <EFeatureFigure url={figure.url} label={figure.label} />
    </figure>
  );
}

/**
 * Picks which of the selected recordings the traces are read from.
 *
 * Built from the viewer's own select so it is the same control as the Protocol and Repetition
 * ones it sits beside — the row reads as one set of choices about one trace, rather than a
 * host control bolted on above the viewer's.
 */
function InputSelect({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <EphysOptionSelect
      label={{ title: 'Inputs', numberOfAvailable: options.length }}
      value={value}
      onChange={onChange}
      fluid
      items={options.map((option) => ({ value: option.id, label: option.name }))}
    />
  );
}

function TracesTab({ recordingIds }: { recordingIds: readonly string[] }) {
  const workspace = useWorkspace();
  const [requestedId, setRequestedId] = useState<string>();

  // a recording removed from the config must not keep driving the viewer
  const activeId =
    requestedId && recordingIds.includes(requestedId) ? requestedId : recordingIds[0];

  // the ids come back out of the config as bare strings; the resolver takes refs
  const refs = useMemo(
    (): TFromIdRef[] =>
      recordingIds.map((id) => ({ type: ELECTRICAL_CELL_RECORDING_FROM_ID, id_str: id })),
    [recordingIds]
  );

  const { entities } = useResolvedModelIdentifierEntities({ refs, context: workspace });

  const options = useMemo(
    () =>
      recordingIds.map((id) => ({
        id,
        name: entities.find((entity) => entity.id === id)?.name ?? id,
      })),
    [entities, recordingIds]
  );

  const { entity, isLoading } = useModelQuery({ id: activeId, context: workspace });
  const recording = entity as IElectricalCellRecording | undefined;

  // one node, handed to whichever branch renders: the select belongs to this tab, not to the
  // trace being loaded, so switching input must never take it off screen
  const inputSelect = (
    <InputSelect options={options} value={activeId ?? ''} onChange={setRequestedId} />
  );

  if (isLoading) {
    return (
      <EphysViewerSkeleton
        view={TraceViewMode.Detailed}
        showViewModeToggle={false}
        controlsVariant="panel"
        detailControls={inputSelect}
      />
    );
  }

  if (!recording) {
    return (
      <div className="flex flex-col gap-6">
        {inputSelect}
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="This recording could not be loaded."
        />
      </div>
    );
  }

  return (
    <EphysViewer
      // remounted per recording: the viewer downloads and indexes one NWB, and carries the
      // protocol/repetition/sweep it settled on for that file
      key={recording.id}
      entity={recording}
      ctx={workspace}
      // one panel among several, already committed to the interactive reading
      showViewModeToggle={false}
      controlsVariant="panel"
      detailControls={inputSelect}
    />
  );
}

/**
 * The traces behind the configuration, and the eFEL illustrations of what is being extracted
 * from them.
 *
 * It is the right column's default view for an e-feature extraction rather than something a
 * protocol opens: the recordings are what the whole configuration is about, so they are on
 * screen from the moment they are chosen. Narrowing to one protocol happens in the viewer's own
 * Protocol select.
 */
export function EFeaturesPreviewPanel({
  config,
  schema,
}: {
  config: Config;
  schema: ConfigSchema;
}) {
  const recordingIds = useMemo(() => extractRecordingIds(config), [config]);
  const { figures, isLoading: figuresLoading } = useEFelFigures(schema);

  if (recordingIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select electrophysiology recordings to see their traces."
        />
      </div>
    );
  }

  return (
    <MotionTabs defaultValue="traces" className="flex h-full flex-col p-2">
      {/* two short labels; a full-width track would leave the pill stranded in dead space */}
      <MotionTabsList className="w-auto self-start">
        <MotionTabsTrigger value="traces">Traces</MotionTabsTrigger>
        <MotionTabsTrigger value="features">Features</MotionTabsTrigger>
      </MotionTabsList>

      <MotionTabsContent value="traces">
        <TracesTab recordingIds={recordingIds} />
      </MotionTabsContent>

      <MotionTabsContent value="features">
        {figuresLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-64 w-full rounded" />
            <Skeleton className="h-64 w-full rounded" />
          </div>
        ) : figures.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="The eFEL illustrations could not be listed."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {figures.map((figure) => (
              <FeatureFigureCard key={figure.name} figure={figure} />
            ))}
          </div>
        )}
      </MotionTabsContent>
    </MotionTabs>
  );
}
