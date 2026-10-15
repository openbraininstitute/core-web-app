'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { Input, InputNumber, Select } from 'antd';
import { useMemo } from 'react';

import { getIonChannelRecording } from '@/api/entitycore/queries/experimental/ion-channel-recording';
import {
  getBrainRegionHierarchiesWithSpecies,
  getBrainRegionHierarchy,
} from '@/api/entitycore/queries/general/brain-region';
import { getSpecies } from '@/api/entitycore/queries/general/species';
import { getStrains } from '@/api/entitycore/queries/general/strain';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';

type TFromID = { type?: string; id_str: string };

export type TIonChannelModelProperties = {
  type?: string;
  ion_channel_name?: string | null;
  temperature?: number | null;
  species?: TFromID | null;
  strain?: TFromID | null;
  brain_region?: TFromID | null;
};

const NEURON_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A channel name as a NEURON SUFFIX: Kv6.2 gives Kv6_2. Mirrors obi-one's `neuron_safe_name`. */
export function neuronSafeName(name: string) {
  const safe = name.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(safe) ? safe : `_${safe}`;
}

/** What a property left unset resolves to: a value, nothing, or no value because they differ. */
type TResolved<T> = { differ: true } | { differ: false; value: T };

function shared<T>(values: T[]): TResolved<T> {
  const distinct = [...new Set(values)];
  return distinct.length > 1 ? { differ: true } : { differ: false, value: distinct[0] };
}

/** The deepest region on the path from the root to every one of the regions. */
export function commonParentRegion(root: IBrainRegionHierarchy, regionIds: string[]) {
  const parents = new Map<string, string | null>();
  const visit = (node: IBrainRegionHierarchy, parent: string | null) => {
    parents.set(node.id, parent);
    for (const child of node.children) visit(child, node.id);
  };
  visit(root, null);

  const pathToRoot = (id: string) => {
    const path: string[] = [];
    for (let current: string | null = id; current; current = parents.get(current) ?? null) {
      path.push(current);
    }
    return path;
  };
  const [first, ...others] = [...new Set(regionIds)].map(pathToRoot);
  if (!first || first.length === 0) return null;
  return first.find((id) => others.every((path) => path.includes(id))) ?? null;
}

function flattenRegions(root: IBrainRegionHierarchy) {
  const options: Array<{ value: string; label: string }> = [];
  const visit = (node: IBrainRegionHierarchy) => {
    options.push({ value: node.id, label: node.name });
    for (const child of node.children) visit(child);
  };
  visit(root);
  return options;
}

function Row({
  label,
  overridden,
  differ,
  derivedNote,
  disabled,
  onReset,
  children,
}: {
  label: string;
  overridden: boolean;
  differ: boolean;
  derivedNote: string;
  disabled: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  const note = (() => {
    if (overridden)
      return disabled ? (
        'Set for this model'
      ) : (
        <button type="button" className="text-primary-7 underline" onClick={onReset}>
          Use the recordings&apos; value
        </button>
      );
    if (differ) return <span className="text-red-600">The recordings differ - set a value</span>;
    return derivedNote;
  })();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-primary-9 text-sm font-semibold">{label}</span>
      {children}
      <span className="text-xs text-neutral-500">{note}</span>
    </div>
  );
}

export function IonChannelModelProperties({
  value,
  recordingIds,
  disabled,
  onChange,
}: {
  value: TIonChannelModelProperties;
  recordingIds: string[];
  disabled: boolean;
  onChange: (value: TIonChannelModelProperties) => void;
}) {
  const context = useWorkspace();

  const recordingQueries = useQueries({
    queries: recordingIds.map((id) => ({
      queryKey: ['ion-channel-model-properties', 'recording', id, context],
      queryFn: () => getIonChannelRecording({ id, context }),
    })),
  });
  const recordings = recordingQueries
    .map((query) => query.data)
    .filter((recording): recording is IIonChannelRecording => !!recording);
  const loaded = recordings.length > 0 && recordings.length === recordingIds.length;

  const { data: speciesList } = useQuery({
    queryKey: ['ion-channel-model-properties', 'species'],
    queryFn: () => getSpecies({ filters: { page_size: 100 } }),
  });
  const { data: strainList } = useQuery({
    queryKey: ['ion-channel-model-properties', 'strains'],
    queryFn: () => getStrains({ filters: { page_size: 100 } }),
  });

  const { data: hierarchies } = useQuery({
    queryKey: ['ion-channel-model-properties', 'hierarchies'],
    queryFn: getBrainRegionHierarchiesWithSpecies,
    staleTime: Infinity,
  });

  const set = (key: keyof TIonChannelModelProperties, next: unknown) =>
    onChange({ ...value, [key]: next ?? null });

  const derived = <T,>(resolved: TResolved<T>) =>
    loaded && !resolved.differ ? resolved.value : undefined;
  const differs = (resolved: TResolved<unknown>) => loaded && resolved.differ;

  const channel = shared(recordings.map((recording) => recording.ion_channel.name));
  const temperature = shared(recordings.map((recording) => recording.temperature ?? null));
  const species = shared(recordings.map((recording) => recording.subject.species.id));
  const speciesId = value.species?.id_str ?? derived(species);
  const strainsOfSpecies = recordings
    .filter((recording) => recording.subject.species.id === speciesId)
    .map((recording) => recording.subject.strain?.id ?? null);
  const strain: TResolved<string | null> =
    strainsOfSpecies.length > 0 ? shared(strainsOfSpecies) : { differ: false, value: null };

  // regions of different hierarchies (one per species) have no common parent; the picker offers
  // the regions of the model's species
  const recordingsHierarchyId = derived(
    shared(recordings.map((recording) => recording.brain_region.hierarchy_id))
  );
  const speciesHierarchyId = hierarchies?.data.find((item) => item.species.id === speciesId)?.id;
  const hierarchyId = value.species
    ? speciesHierarchyId
    : (recordingsHierarchyId ?? speciesHierarchyId);
  const { data: regionTree } = useQuery({
    queryKey: ['ion-channel-model-properties', 'hierarchy', hierarchyId],
    queryFn: () => getBrainRegionHierarchy({ id: hierarchyId }),
    enabled: !!hierarchyId,
    staleTime: Infinity,
  });
  const treeRegionOptions = useMemo(
    () => (regionTree ? flattenRegions(regionTree) : []),
    [regionTree]
  );
  const regionIds = recordings.map((recording) => recording.brain_region.id);
  const regionsDiffer = new Set(regionIds).size > 1;
  const commonParent = (() => {
    if (!loaded) return undefined;
    if (!regionsDiffer) return regionIds[0];
    if (!regionTree || !recordingsHierarchyId || hierarchyId !== recordingsHierarchyId) return;
    return commonParentRegion(regionTree, regionIds) ?? undefined;
  })();
  // a recordings' region outside the model species' hierarchy still shows by name
  const regionValue = value.brain_region?.id_str ?? commonParent;
  const recordingRegion = recordings.find((recording) => recording.brain_region.id === regionValue);
  const regionOptions =
    recordingRegion && !treeRegionOptions.some((option) => option.value === regionValue)
      ? [
          { value: recordingRegion.brain_region.id, label: recordingRegion.brain_region.name },
        ].concat(treeRegionOptions)
      : treeRegionOptions;

  const derivedName = derived(channel);
  const nameValue = value.ion_channel_name ?? (derivedName ? neuronSafeName(derivedName) : '');
  const nameInvalid = !!value.ion_channel_name && !NEURON_NAME.test(value.ion_channel_name);

  const speciesOptions = (speciesList?.data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const strainOptions = (strainList?.data ?? [])
    .filter((item) => String(item.species_id) === speciesId)
    .map((item) => ({ value: item.id, label: item.name }));

  return (
    <div
      className="flex flex-col gap-4"
      data-scan-config-block-element={ScanConfigUIElementDict.IonChannelModelProperties}
    >
      <Row
        label="Ion channel name"
        overridden={!!value.ion_channel_name}
        differ={differs(channel)}
        derivedNote={derivedName ? `From the recordings' channel, ${derivedName}` : ''}
        disabled={disabled}
        onReset={() => set('ion_channel_name', null)}
      >
        <Input
          disabled={disabled}
          value={nameValue}
          status={nameInvalid ? 'error' : undefined}
          placeholder="The mod file SUFFIX, e.g. Kv6_2"
          onChange={(e) => set('ion_channel_name', e.currentTarget.value || null)}
        />
        {nameInvalid && (
          <span className="text-xs text-red-600">
            Start with a letter or underscore, and use only letters, numbers and underscores
          </span>
        )}
      </Row>

      <Row
        label="Temperature (°C)"
        overridden={value.temperature != null}
        differ={differs(temperature)}
        derivedNote={
          derived(temperature) === null ? 'The recordings have none' : 'From the recordings'
        }
        disabled={disabled}
        onReset={() => set('temperature', null)}
      >
        <InputNumber
          className="w-full"
          controls={false}
          disabled={disabled}
          value={value.temperature ?? derived(temperature) ?? null}
          onChange={(next) => set('temperature', next)}
        />
      </Row>

      <Row
        label="Species"
        overridden={!!value.species}
        differ={differs(species)}
        derivedNote="From the recordings"
        disabled={disabled}
        onReset={() => onChange({ ...value, species: null, strain: null })}
      >
        <Select
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          options={speciesOptions}
          value={speciesId ?? null}
          onChange={(id: string) =>
            onChange({ ...value, species: { type: 'SpeciesFromID', id_str: id }, strain: null })
          }
        />
      </Row>

      <Row
        label="Strain"
        overridden={!!value.strain}
        differ={differs(strain)}
        derivedNote={
          derived(strain) === null ? 'None of the recordings has one' : 'From the recordings'
        }
        disabled={disabled}
        onReset={() => set('strain', null)}
      >
        <Select
          disabled={disabled || !speciesId}
          showSearch
          optionFilterProp="label"
          options={strainOptions}
          placeholder="None"
          value={value.strain?.id_str ?? derived(strain) ?? null}
          onChange={(id: string) => set('strain', { type: 'StrainFromID', id_str: id })}
        />
      </Row>

      <Row
        label="Brain region"
        overridden={!!value.brain_region}
        // still loading the hierarchy the common parent comes from
        differ={loaded && regionsDiffer && !commonParent && !(recordingsHierarchyId && !regionTree)}
        derivedNote={
          regionsDiffer ? "The common parent of the recordings' regions" : 'From the recordings'
        }
        disabled={disabled}
        onReset={() => set('brain_region', null)}
      >
        <Select
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          options={regionOptions}
          loading={!!hierarchyId && !regionTree}
          value={regionValue ?? null}
          onChange={(id: string) => set('brain_region', { type: 'BrainRegionFromID', id_str: id })}
        />
      </Row>
    </div>
  );
}
