'use client';

import { Empty } from 'antd';

import { EphysViewer } from '@/features/ephys-viewer';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  MotionTabs,
  MotionTabsContent,
  MotionTabsList,
  MotionTabsTrigger,
} from '@/ui/molecules/motion-tabs';

import { EFeatureFigure } from './feature-figure';
import { ecodeNameFromTypeName } from './helpers';

import type { IElectricalCellRecording } from '@/api/entitycore/types';
import type { TFeatureDef, TProtocolDef, TProtocolValue } from './types';

/** One feature's illustration with its name and description. */
function FeatureFigureCard({
  def,
  figureUrl,
  label,
}: {
  def: TFeatureDef;
  figureUrl: string | null;
  label: string;
}) {
  return (
    <figure className="border-neutral-2 flex flex-col gap-1 rounded border p-2">
      <figcaption className="text-primary-9 text-sm font-semibold">{label}</figcaption>
      {def.description && <p className="text-xs text-gray-500">{def.description}</p>}
      <EFeatureFigure url={figureUrl} label={label} />
    </figure>
  );
}

/**
 * What a protocol looks like on the chosen recordings: the raw traces, and the illustrations of
 * the features being extracted from them.
 *
 * Opened by clicking the protocol itself rather than its `≡`, which stays reserved for editing.
 */
export function ProtocolPreviewPanel({
  def,
  value,
  entity,
  figureUrlFor,
  featureLabelFor,
}: {
  def: TProtocolDef;
  value: TProtocolValue | undefined;
  /** the recording the editor resolved for this config, when it is an electrophysiology entity */
  entity: IElectricalCellRecording | null;
  figureUrlFor: (feature: TFeatureDef) => string | null;
  featureLabelFor: (feature: TFeatureDef) => string;
}) {
  const workspace = useWorkspace();

  // an unselected protocol has no chosen features yet, so fall back to everything it can extract
  const featureDefs =
    value && value.features.length > 0
      ? value.features
          .map((feature) => def.featureDefs.find((entry) => entry.typeName === feature.type))
          .filter((entry): entry is TFeatureDef => entry !== undefined)
      : def.featureDefs;

  return (
    <MotionTabs defaultValue="traces" className="flex flex-col">
      <MotionTabsList>
        <MotionTabsTrigger value="traces">Traces</MotionTabsTrigger>
        <MotionTabsTrigger value="features">Features</MotionTabsTrigger>
      </MotionTabsList>

      <MotionTabsContent value="traces">
        {entity ? (
          <EphysViewer
            entity={entity}
            ctx={workspace}
            defaultToInteractiveDetails
            protocol={ecodeNameFromTypeName(def.typeName)}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Traces are shown once a recording is resolved for this configuration."
          />
        )}
      </MotionTabsContent>

      <MotionTabsContent value="features">
        {featureDefs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="This protocol has no features to illustrate."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {featureDefs.map((feature) => (
              <FeatureFigureCard
                key={feature.typeName}
                def={feature}
                figureUrl={figureUrlFor(feature)}
                label={featureLabelFor(feature)}
              />
            ))}
          </div>
        )}
      </MotionTabsContent>
    </MotionTabs>
  );
}
