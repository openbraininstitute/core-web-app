'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { Input, InputNumber, Select } from 'antd';
import { useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';

import { getIonChannelRecording } from '@/api/entitycore/queries/experimental/ion-channel-recording';
import {
  getBrainRegionHierarchiesWithSpecies,
  getBrainRegionHierarchy,
} from '@/api/entitycore/queries/general/brain-region';
import { getSpecies } from '@/api/entitycore/queries/general/species';
import { getStrains } from '@/api/entitycore/queries/general/strain';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { useAppNotification } from '@/components/notification';
import { flattenTreeAsObject } from '@/components/tree/elements/helpers';
import {
  useFieldError,
  useFieldErrorsSessionKey,
} from '@/features/scan-config/components/hooks/field-errors';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { makeSessionAtomWithDefault } from '@/ui/hooks/use-session-atom';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { Config, ConfigSchema, ParamSchema } from '@/features/scan-config/types';

type TFromID = { type?: string; id_str: string };

export type TIonChannelModelPropertiesValue = {
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
  derivedNote?: string;
  disabled: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  const note = (() => {
    // differing recordings have no value to go back to
    if (differ) return overridden ? null : <span className="text-red-500">Required</span>;
    if (overridden)
      return disabled ? null : (
        <button type="button" className="text-primary-7 underline" onClick={onReset}>
          Use the recordings&apos; value
        </button>
      );
    return derivedNote;
  })();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-primary-9 text-sm font-semibold">{label}</span>
      {children}
      {note && <span className="text-xs text-neutral-500">{note}</span>}
    </div>
  );
}

/** The recordings the model is fitted to, held by the block's sibling `recordings` element. */
export function recordingIdsOf(block: unknown) {
  const recordings = isPlainObject(block) ? block.recordings : undefined;
  return (Array.isArray(recordings) ? recordings : []).flatMap((recording) =>
    isPlainObject(recording) && typeof recording.id_str === 'string' ? [recording.id_str] : []
  );
}

function useModelProperties(value: TIonChannelModelPropertiesValue, recordingIds: string[]) {
  const context = useWorkspace();

  const recordingQueries = useQueries({
    queries: recordingIds.map((id) => ({
      queryKey: keyBuilder.entity({ id, context, type: EntityTypeDict.IonChannelRecording }),
      queryFn: () => getIonChannelRecording({ id, context }),
      refetchOnWindowFocus: false,
    })),
  });
  const recordings = recordingQueries
    .map((query) => query.data)
    .filter((recording): recording is IIonChannelRecording => !!recording);
  const loaded = recordings.length > 0 && recordings.length === recordingIds.length;
  const failed = recordingQueries.some((query) => query.isError);

  const { data: hierarchies } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchies(),
    queryFn: getBrainRegionHierarchiesWithSpecies,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const derived = <T,>(resolved: TResolved<T>) =>
    loaded && !resolved.differ ? resolved.value : undefined;
  const differs = (resolved: TResolved<unknown>) => loaded && resolved.differ;

  const channel = shared(recordings.map((recording) => recording.ion_channel.name));
  const temperature = shared(recordings.map((recording) => recording.temperature ?? null));
  const temperatureOptions = [
    ...new Set(recordings.flatMap(({ temperature: t }) => (t == null ? [] : [t]))),
  ].map((t) => ({
    value: t,
    names: recordings.filter((r) => r.temperature === t).map((r) => r.name),
  }));
  const species = shared(recordings.map((recording) => recording.subject.species.id));
  const speciesId = value.species?.id_str ?? derived(species);
  const strainsOfSpecies = recordings
    .filter((recording) => recording.subject.species.id === speciesId)
    .map((recording) => recording.subject.strain?.id ?? null);
  const strain = shared(strainsOfSpecies.length > 0 ? strainsOfSpecies : [null]);

  // regions of different hierarchies (one per species) have no common parent; the picker offers
  // the regions of the model's species
  const recordingsHierarchyId = derived(
    shared(recordings.map((recording) => recording.brain_region.hierarchy_id))
  );
  const speciesHierarchyId = hierarchies?.data.find((item) => item.species.id === speciesId)?.id;
  const hierarchyId = (!value.species && recordingsHierarchyId) || speciesHierarchyId;
  const hierarchyQuery = (id: string | undefined, enabled: boolean) => ({
    queryKey: keyBuilderHierarchy.hierarchy({ id: id ?? '' }),
    queryFn: () => getBrainRegionHierarchy({ id }),
    enabled: enabled && !!id,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const { data: regionTree } = useQuery(hierarchyQuery(hierarchyId, true));
  const regionIds = recordings.map((recording) => recording.brain_region.id);
  const regionKey = regionIds.join(',');
  const regionsDiffer = new Set(regionIds).size > 1;
  // obi-one takes the common parent in the recordings' own hierarchy, whatever the model's species
  const { data: recordingsTree } = useQuery(hierarchyQuery(recordingsHierarchyId, regionsDiffer));
  const commonParent = useMemo(() => {
    if (!regionsDiffer || !recordingsTree) return undefined;
    const id = commonParentRegion(recordingsTree, regionKey.split(','));
    return flattenTreeAsObject(recordingsTree).find((region) => region.id === id);
  }, [regionsDiffer, recordingsTree, regionKey]);
  const commonRegion = regionsDiffer ? commonParent : recordings[0]?.brain_region;
  const treeRegionOptions = useMemo(
    () =>
      regionTree
        ? flattenTreeAsObject(regionTree).map((region) => ({
            value: region.id,
            label: region.name,
          }))
        : [],
    [regionTree]
  );
  // the recordings' region outside the model species' hierarchy still shows by name
  const regionValue = value.brain_region?.id_str ?? (loaded ? commonRegion?.id : undefined);
  const regionOptions =
    commonRegion &&
    regionValue === commonRegion.id &&
    !treeRegionOptions.some((option) => option.value === regionValue)
      ? [{ value: commonRegion.id, label: commonRegion.name }, ...treeRegionOptions]
      : treeRegionOptions;

  const derivedName = derived(channel);
  const nameValue = value.ion_channel_name ?? (derivedName ? neuronSafeName(derivedName) : '');
  const nameInvalid = !!value.ion_channel_name && !NEURON_NAME.test(value.ion_channel_name);

  const differ = {
    ion_channel_name: differs(channel),
    temperature: differs(temperature),
    species: differs(species),
    strain: differs(strain),
    // still loading the hierarchy the common parent comes from
    brain_region:
      loaded && regionsDiffer && !commonParent && !(recordingsHierarchyId && !recordingsTree),
  };
  const missing = (Object.keys(differ) as Array<keyof typeof differ>).filter(
    (key) => differ[key] && value[key] == null
  );

  return {
    loaded,
    failed,
    differ,
    missing,
    derivedName,
    nameValue,
    nameInvalid,
    sharedTemperature: derived(temperature),
    temperatureOptions,
    firstHasTemperature: recordings[0]?.temperature != null,
    regionsDiffer,
    regionRootId: regionTree?.id,
    regionLoading: !!hierarchyId && !regionTree,
    regionOptions,
    regionValue,
    speciesId,
    sharedStrain: derived(strain),
  };
}

const PROPERTY_LABEL: Record<keyof ReturnType<typeof useModelProperties>['differ'], string> = {
  ion_channel_name: 'ion channel name',
  temperature: 'temperature',
  species: 'species',
  strain: 'strain',
  brain_region: 'brain region',
};

/** The temperature written for the user when the recordings differ, until they pick one. */
const preselectedTemperatureAtomFamily = makeSessionAtomWithDefault<number | null>(null);

function usePreselectedTemperature() {
  return useAtom(preselectedTemperatureAtomFamily(useFieldErrorsSessionKey()));
}

function readProperties(config: Config, root: string, propertyKey: string) {
  const block = isPlainObject(config[root]) ? config[root] : {};
  const value = isPlainObject(block[propertyKey]) ? block[propertyKey] : {};
  return { block, value: value as TIonChannelModelPropertiesValue };
}

function withProperties(
  config: Config,
  root: string,
  propertyKey: string,
  patch: TIonChannelModelPropertiesValue
) {
  const { block, value } = readProperties(config, root, propertyKey);
  return { ...config, [root]: { ...block, [propertyKey]: { ...value, ...patch } } } as Config;
}

/**
 * Preselects the first recording's temperature when the recordings differ, and the root region
 * when their regions have no common parent; publishes what is still to be set, so the root
 * element's tick and the Generate button agree with the form even while the block is closed.
 */
function ModelPropertiesCheck({
  root,
  propertyKey,
  config,
  setConfig,
  locked,
}: {
  root: string;
  propertyKey: string;
  config: Config;
  setConfig: (update: (previous: Config) => Config) => void;
  locked: boolean;
}) {
  const path = `${root}.${propertyKey}`;
  const { block, value } = readProperties(config, root, propertyKey);
  const { loaded, failed, missing, differ, temperatureOptions, firstHasTemperature, regionRootId } =
    useModelProperties(value, recordingIdsOf(block));
  const [preselected, setPreselected] = usePreselectedTemperature();
  const notification = useAppNotification();
  const untouched = value.temperature == null || value.temperature === preselected;
  const target = differ.temperature ? (temperatureOptions[0]?.value ?? null) : null;
  const rootRegion = differ.brain_region && !value.brain_region ? regionRootId : undefined;

  useEffect(() => {
    if (locked || !loaded || !untouched || value.temperature === target) return;
    setPreselected(target);
    setConfig((previous) => withProperties(previous, root, propertyKey, { temperature: target }));
    if (target == null) return;
    const source = firstHasTemperature
      ? `The first recording's ${target} °C`
      : `${target} °C, from the first recording that has one,`;
    notification.info({
      key: 'ion-channel-temperatures-differ',
      duration: 6,
      message: 'The recordings were measured at different temperatures',
      description: `${source} is preselected - check the model's temperature.`,
    });
  }, [
    locked,
    loaded,
    untouched,
    value.temperature,
    target,
    firstHasTemperature,
    root,
    propertyKey,
    setPreselected,
    setConfig,
    notification,
  ]);

  useEffect(() => {
    if (locked || !rootRegion) return;
    setConfig((previous) =>
      withProperties(previous, root, propertyKey, {
        brain_region: { type: 'BrainRegionFromID', id_str: rootRegion },
      })
    );
  }, [locked, rootRegion, root, propertyKey, setConfig]);

  useFieldError(
    path,
    failed
      ? "The recordings could not be loaded, so the model's properties cannot be checked"
      : missing.length > 0
        ? `The recordings differ - set the model's ${missing.map((item) => PROPERTY_LABEL[item]).join(', ')}`
        : undefined
  );
  return null;
}

export function IonChannelModelPropertiesChecks({
  schema,
  config,
  setConfig,
  locked,
}: {
  schema: ConfigSchema;
  config: Config;
  setConfig: (update: (previous: Config) => Config) => void;
  locked: boolean;
}) {
  return Object.entries(schema.properties).flatMap(([root, rootSchema]) =>
    Object.entries((rootSchema as { properties?: Record<string, ParamSchema> }).properties ?? {})
      .filter(([, param]) => param.ui_element === ScanConfigUIElementDict.IonChannelModelProperties)
      .map(([key]) => (
        <ModelPropertiesCheck
          key={`${root}.${key}`}
          root={root}
          propertyKey={key}
          config={config}
          setConfig={setConfig}
          locked={locked}
        />
      ))
  );
}

const CUSTOM_TEMPERATURE = 'custom';

export function IonChannelModelProperties({
  value,
  recordingIds,
  disabled,
  onChange,
}: {
  value: TIonChannelModelPropertiesValue;
  recordingIds: string[];
  disabled: boolean;
  onChange: (value: TIonChannelModelPropertiesValue) => void;
}) {
  const {
    differ,
    derivedName,
    nameValue,
    nameInvalid,
    sharedTemperature,
    temperatureOptions,
    regionsDiffer,
    regionLoading,
    regionOptions,
    regionValue,
    speciesId,
    sharedStrain,
  } = useModelProperties(value, recordingIds);
  const [, setPreselectedTemperature] = usePreselectedTemperature();
  const [customTemperature, setCustomTemperature] = useState(false);
  const [nameCleared, setNameCleared] = useState(false);

  const { data: speciesList } = useQuery({
    queryKey: ['ion-channel-model-properties', 'species'],
    queryFn: () => getSpecies({ filters: { page_size: 100 } }),
  });
  const { data: strainList } = useQuery({
    queryKey: ['ion-channel-model-properties', 'strains'],
    queryFn: () => getStrains({ filters: { page_size: 100 } }),
  });
  const speciesOptions = (speciesList?.data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const strainOptions = (strainList?.data ?? [])
    .filter((item) => String(item.species_id) === speciesId)
    .map((item) => ({ value: item.id, label: item.name }));

  const set = (key: keyof TIonChannelModelPropertiesValue, next: unknown) =>
    onChange({ ...value, [key]: next ?? null });

  const currentTemperature = value.temperature ?? sharedTemperature ?? null;
  const showCustomTemperature =
    customTemperature ||
    (currentTemperature != null &&
      !temperatureOptions.some((option) => option.value === currentTemperature));
  const pickTemperature = (next: number | null) => {
    setPreselectedTemperature(null);
    // the recordings' shared value is the default, not an override
    set('temperature', !differ.temperature && next === sharedTemperature ? null : next);
  };

  return (
    <div
      className="flex flex-col gap-4"
      data-scan-config-block-element={ScanConfigUIElementDict.IonChannelModelProperties}
    >
      <Row
        label="Ion channel name"
        overridden={!!value.ion_channel_name}
        differ={differ.ion_channel_name}
        derivedNote={derivedName ? `From the recordings' channel, ${derivedName}` : ''}
        disabled={disabled}
        onReset={() => set('ion_channel_name', null)}
      >
        <Input
          disabled={disabled}
          // a cleared field stays empty while typing; the recordings' name comes back on blur
          value={nameCleared ? '' : nameValue}
          status={nameInvalid ? 'error' : undefined}
          placeholder="The mod file SUFFIX, e.g. Kv6_2"
          onChange={(e) => {
            setNameCleared(e.currentTarget.value === '');
            set('ion_channel_name', e.currentTarget.value || null);
          }}
          onBlur={() => setNameCleared(false)}
        />
        {nameInvalid && (
          <span className="text-xs text-red-600">
            Start with a letter or underscore, and use only letters, numbers and underscores
          </span>
        )}
      </Row>

      <Row
        label="Temperature (°C)"
        overridden={!differ.temperature && value.temperature != null}
        differ={differ.temperature && currentTemperature == null}
        derivedNote={sharedTemperature == null ? undefined : 'From the recordings'}
        disabled={disabled}
        onReset={() => {
          setCustomTemperature(false);
          set('temperature', null);
        }}
      >
        <Select
          disabled={disabled}
          placeholder="None"
          options={[
            ...temperatureOptions.map((option) => ({
              value: option.value,
              label: differ.temperature
                ? `${option.value} °C - ${option.names.join(', ')}`
                : `${option.value} °C`,
            })),
            { value: CUSTOM_TEMPERATURE, label: 'Custom value' },
          ]}
          value={showCustomTemperature ? CUSTOM_TEMPERATURE : currentTemperature}
          onChange={(next: number | typeof CUSTOM_TEMPERATURE) => {
            setCustomTemperature(next === CUSTOM_TEMPERATURE);
            if (next !== CUSTOM_TEMPERATURE) pickTemperature(next);
          }}
        />
        {showCustomTemperature && (
          <InputNumber
            className="w-full!"
            controls={false}
            disabled={disabled}
            placeholder="Temperature in °C"
            value={currentTemperature}
            // differing recordings need a temperature, so clearing the box keeps the last one
            onChange={(next) => {
              if (next != null || !differ.temperature) pickTemperature(next);
            }}
          />
        )}
      </Row>

      <Row
        label="Species"
        overridden={!!value.species}
        differ={differ.species}
        derivedNote="From the recordings"
        disabled={disabled}
        onReset={() => onChange({ ...value, species: null, strain: null, brain_region: null })}
      >
        <Select
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          options={speciesOptions}
          value={speciesId ?? null}
          onChange={(id: string) =>
            onChange({
              ...value,
              species: { type: 'SpeciesFromID', id_str: id },
              strain: null,
              brain_region: null,
            })
          }
        />
      </Row>

      <Row
        label="Strain"
        overridden={!!value.strain}
        differ={differ.strain}
        derivedNote={sharedStrain == null ? undefined : 'From the recordings'}
        disabled={disabled}
        onReset={() => set('strain', null)}
      >
        <Select
          disabled={disabled || !speciesId}
          showSearch
          optionFilterProp="label"
          options={strainOptions}
          placeholder="None"
          value={value.strain?.id_str ?? sharedStrain ?? null}
          onChange={(id: string) => set('strain', { type: 'StrainFromID', id_str: id })}
        />
      </Row>

      <Row
        label="Brain region"
        overridden={!!value.brain_region}
        differ={differ.brain_region}
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
          loading={regionLoading}
          value={regionValue ?? null}
          onChange={(id: string) => set('brain_region', { type: 'BrainRegionFromID', id_str: id })}
        />
      </Row>
    </div>
  );
}
