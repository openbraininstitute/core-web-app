'use client';

import {
  CloseOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCloseCircleFill,
  RiEqualizerLine,
  RiSearchLine,
  RiSubtractLine,
} from '@remixicon/react';
import { Checkbox, Empty, Tooltip } from 'antd';
import { kebabCase } from 'es-toolkit/compat';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  useIsSettingsPanelOpen,
  useScanConfigSettingsPanelHeaderSlot,
  useScanConfigSettingsPanelSlot,
  useSetScanConfigSettingsPanel,
} from '@/features/scan-config/bridge/settings-panel';
import { cn } from '@/utils/css-class';

import { EFeatureFigure } from './feature-figure';
import {
  fieldUnsetValue,
  isFieldSet,
  makeFeatureValue,
  makeFilledProtocolValue,
  mergeAmplitudeOptions,
} from './helpers';

import type { ConfigValue, ParamSchema } from '@/features/scan-config/types';
import type {
  TExtractionAmplitude,
  TFeatureCategory,
  TFeatureDef,
  TFeatureValue,
  TProtocolDef,
  TProtocolValue,
} from './types';

/**
 * Renders one schema-described field.
 *
 * Supplied by the widget rather than imported here: the shared renderer lives in the
 * ui-elements barrel that also mounts this widget, so taking it as a prop keeps the
 * dependency one-way.
 */
export type TRenderField = (args: {
  fieldKey: string;
  paramSchema: ParamSchema;
  state: Record<string, ConfigValue>;
  setState: (next: Record<string, ConfigValue>) => void;
}) => React.ReactNode;

/** eFEL keys are what scientists recognise; the humanised class name is only a fallback. */
function featureLabel(def: TFeatureDef): string {
  return def.efelName ?? def.label;
}

function fieldExtras(paramSchema: ParamSchema) {
  const extras = paramSchema as unknown as Record<string, unknown>;
  return {
    title: typeof extras.title === 'string' ? extras.title : null,
    units: typeof extras.units === 'string' ? extras.units : null,
    description: typeof extras.description === 'string' ? extras.description : null,
  };
}

/** One settings field: label, unit, the schema's own description, and a way to remove it. */
function FieldRow({
  fieldKey,
  paramSchema,
  state,
  setState,
  renderField,
  onRemove,
  disabled,
}: {
  fieldKey: string;
  paramSchema: ParamSchema;
  state: Record<string, ConfigValue>;
  setState: (next: Record<string, ConfigValue>) => void;
  renderField: TRenderField;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const { title, units, description } = fieldExtras(paramSchema);
  const label = title ?? fieldKey;

  return (
    // the label row is scoped to the input's own column so the unit stays pinned to the input's
    // right edge; keeping them in one row would shift the unit over the clear button whenever
    // that button appears
    <div className="flex items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className="text-xs tracking-wide text-gray-500 uppercase">{label}</span>
            {description && (
              <Tooltip title={description}>
                <InfoCircleOutlined className="text-xs text-gray-400" />
              </Tooltip>
            )}
          </span>
          {units && <span className="shrink-0 text-xs text-gray-400">{units}</span>}
        </div>
        {renderField({ fieldKey, paramSchema, state, setState })}
      </div>
      {onRemove && (
        <button
          type="button"
          disabled={disabled}
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
          onClick={onRemove}
          className="shrink-0 pb-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <DeleteOutlined />
        </button>
      )}
    </div>
  );
}

/**
 * Every settings field of one protocol or feature.
 *
 * The whole form is shown at once: these are the knobs the schema defines for this object, and
 * hiding them behind a picker made the form look emptier than it is. A field can still be cleared
 * back to its default — for the stimulus timings that is `0.0`, which obi-one reads as "detect
 * from the recording".
 */
function SettingsFields({
  fields,
  state,
  setState,
  renderField,
  disabled,
  onReset,
}: {
  fields: Array<[string, ParamSchema]>;
  state: Record<string, ConfigValue>;
  setState: (next: Record<string, ConfigValue>) => void;
  renderField: TRenderField;
  disabled: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {fields.map(([fieldKey, fieldSchema]) => (
        <FieldRow
          key={fieldKey}
          fieldKey={fieldKey}
          paramSchema={fieldSchema}
          state={state}
          setState={setState}
          renderField={renderField}
          disabled={disabled}
          // nothing to clear when the field is already sitting at its default
          onRemove={
            isFieldSet(fieldSchema, state[fieldKey])
              ? () => setState({ ...state, [fieldKey]: fieldUnsetValue(fieldSchema) })
              : undefined
          }
        />
      ))}

      <footer className="flex items-center pt-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <ReloadOutlined /> Reset settings
        </button>
      </footer>
    </div>
  );
}

/**
 * Shared plumbing for anything that drives the right-column panel: it reports whether its panel
 * is the open one, closes it on unmount, and portals `children` into the column's mount point.
 */
function usePanel(panelKey: string) {
  const setPanel = useSetScanConfigSettingsPanel();
  const isOpen = useIsSettingsPanelOpen(panelKey);
  const slot = useScanConfigSettingsPanelSlot();

  // removing a feature or deselecting a protocol takes its trigger away; without this the panel
  // would stay open with nothing left to render into it
  useEffect(() => {
    return () => {
      setPanel((current) => (current.open?.key === panelKey ? { open: null } : {}));
    };
  }, [panelKey, setPanel]);

  const toggle = (title: string) => setPanel({ open: isOpen ? null : { key: panelKey, title } });
  const portal = (children: React.ReactNode) =>
    isOpen && slot ? createPortal(children, slot) : null;

  return { isOpen, toggle, portal };
}

function SettingsButton({
  panelKey,
  title,
  disabled,
  children,
  light,
  className,
}: {
  panelKey: string;
  title: string;
  disabled: boolean;
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  const { isOpen, toggle, portal } = usePanel(panelKey);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={title}
        aria-expanded={isOpen}
        title={title}
        onClick={() => toggle(title)}
        className={cn(
          'shrink-0 transition-colors disabled:opacity-50',
          light ? 'text-white' : 'text-primary-8',
          className,
          isOpen && 'bg-white text-primary-9! shadow-sm ring-2 ring-white/60'
        )}
      >
        <RiEqualizerLine className="size-4" />
      </button>
      {portal(children)}
    </>
  );
}

/** Shared frame for a settings form: its description, then the fields themselves. */
function SettingsForm({
  description,
  children,
}: {
  description: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {children}
    </div>
  );
}

function AmplitudeSettings({
  value,
  onChange,
  discoveredAmplitudes,
  disabled,
}: {
  value: TProtocolValue;
  onChange: (next: TProtocolValue) => void;
  discoveredAmplitudes: number[] | undefined;
  disabled: boolean;
}) {
  const amplitudeOptions = useMemo(
    () => mergeAmplitudeOptions(discoveredAmplitudes, value.extraction_amplitudes),
    [discoveredAmplitudes, value.extraction_amplitudes]
  );

  const selectedByAmplitude = useMemo(
    () => new Map(value.extraction_amplitudes),
    [value.extraction_amplitudes]
  );

  const setAmplitudes = (next: TExtractionAmplitude[]) => {
    onChange({ ...value, extraction_amplitudes: [...next].sort((a, b) => a[0] - b[0]) });
  };

  if (amplitudeOptions.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No amplitudes discovered for this protocol in the selected recordings.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {amplitudeOptions.map((amplitude) => {
        const isSelected = selectedByAmplitude.has(amplitude);
        return (
          <li key={amplitude} className="flex items-center justify-between gap-3">
            <Checkbox
              disabled={disabled}
              checked={isSelected}
              onChange={(event) =>
                setAmplitudes(
                  event.target.checked
                    ? [...value.extraction_amplitudes, [amplitude, false]]
                    : value.extraction_amplitudes.filter(([current]) => current !== amplitude)
                )
              }
            >
              {amplitude}
            </Checkbox>
            {isSelected && (
              <Checkbox
                disabled={disabled}
                checked={selectedByAmplitude.get(amplitude) === true}
                onChange={(event) =>
                  setAmplitudes(
                    value.extraction_amplitudes.map(
                      ([current, previous]): TExtractionAmplitude =>
                        current === amplitude
                          ? [current, event.target.checked]
                          : [current, previous]
                    )
                  )
                }
              >
                <span className="text-xs text-gray-500">Validation</span>
              </Checkbox>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Section headings for the catalogue, in the order eFEL's own documentation presents them. */
const CATEGORY_LABELS: Array<[TFeatureCategory, string]> = [
  ['spike_event', 'Spike event'],
  ['spike_shape', 'Spike shape'],
  ['subthreshold', 'Subthreshold'],
  ['other', 'Other'],
];

/** Rounded search field, portalled into the panel header so it sits beside the title. */
function CatalogueSearch({
  query,
  onQueryChange,
  total,
  disabled,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  total: number;
  disabled: boolean;
}) {
  return (
    <div
      className={cn(
        'flex w-full max-w-90 min-w-48 items-center gap-2 rounded-full px-3.5 py-1.5',
        'bg-neutral-1 focus-within:bg-white focus-within:ring-primary-8/40 focus-within:ring-2',
        'transition-colors duration-150'
      )}
    >
      <RiSearchLine aria-hidden className="size-4 shrink-0 text-gray-400" />
      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={`Search ${total}`}
        aria-label="Search features"
        className="min-w-0 flex-1 bg-transparent text-sm text-primary-9 outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onQueryChange('')}
          className="shrink-0 text-gray-300 transition-colors hover:text-gray-500"
        >
          <RiCloseCircleFill className="size-4.5" />
        </button>
      )}
    </div>
  );
}

/** One catalogue row: the feature, its documentation link, and its add / remove control. */
function CatalogueRow({
  feature,
  isSelected,
  docUrl,
  disabled,
  onToggle,
}: {
  feature: TFeatureDef;
  isSelected: boolean;
  docUrl: string | null;
  disabled: boolean;
  onToggle: () => void;
}) {
  const label = featureLabel(feature);

  return (
    <li
      id={`feature-catalogue-row-${feature.typeName}`}
      className="group/row relative flex items-center"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isSelected}
        onClick={onToggle}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-r-md py-2 pr-14 pl-3 text-left',
          // pressed feedback lands on pointer-down rather than on release
          'transition-colors duration-100 active:scale-[0.995] disabled:opacity-50',
          isSelected
            ? // the left rule carries the state, so the tint can stay quiet — a run of selected
              // rows would otherwise band into one block
              'text-primary-9 bg-primary-0/60 border-primary-9/40 border-l-2 hover:bg-primary-0'
            : 'border-l-2 border-transparent text-gray-600 hover:bg-neutral-1 hover:text-primary-9'
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate text-base', isSelected && 'font-semibold')}>
          {label}
        </span>
      </button>

      {/* absolute so the row's own hit area stays one uninterrupted target for the toggle */}
      <span className="pointer-events-none absolute right-2.5 flex items-center gap-1.5">
        {docUrl && (
          <Tooltip title={`eFEL documentation for ${label}`} mouseEnterDelay={0.4}>
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the eFEL documentation for ${label} in a new tab`}
              // the same icon the card's own feature rows use, and always present: a link that
              // only appears on hover cannot be found by someone looking for it
              className={cn(
                'pointer-events-auto flex size-6 items-center justify-center rounded-md',
                'hover:text-primary-8 text-gray-400 transition-colors duration-150'
              )}
            >
              <LinkOutlined />
            </a>
          </Tooltip>
        )}
        <span
          aria-hidden
          className={cn(
            'flex size-6 items-center justify-center rounded-full border transition-colors',
            'duration-150',
            isSelected
              ? // quiet while it is only reporting state; solid once the pointer is on the row and
                // removal is the likely next act
                'bg-primary-9/10 border-primary-9/20 text-primary-9 group-hover/row:border-primary-9 group-hover/row:bg-primary-9 group-hover/row:text-white'
              : 'bg-neutral-1 border-neutral-2 text-primary-8 group-hover/row:border-primary-8 group-hover/row:bg-white'
          )}
        >
          {isSelected ? <RiSubtractLine className="size-4" /> : <RiAddLine className="size-4" />}
        </span>
      </span>
    </li>
  );
}

/**
 * The whole eFEL catalogue for one protocol, rendered into the right-hand column.
 *
 * Every feature is listed, grouped by `efel_feature_category`, with the ones already on this
 * protocol marked and removable in place. The list is the catalogue rather than a picker of what
 * is missing, so a feature does not jump out of the list the moment it is added — the same
 * reasoning that makes the protocol cards themselves list every protocol.
 *
 * The category headings stay while filtering, and stick to the top of the scroll area, so a row
 * seen in isolation is never ambiguous about which family it belongs to.
 *
 * It lives in the panel column, not in the card: 146 rows would push every other protocol off
 * screen.
 */
function FeatureCatalogue({
  def,
  catalogueDefs,
  value,
  onChange,
  disabled,
  docUrlFor,
}: {
  def: TProtocolDef;
  catalogueDefs: TFeatureDef[];
  value: TProtocolValue;
  onChange: (next: TProtocolValue) => void;
  disabled: boolean;
  docUrlFor: (feature: TFeatureDef) => string | null;
}) {
  const [query, setQuery] = useState('');
  const headerSlot = useScanConfigSettingsPanelHeaderSlot();

  const selectedTypes = useMemo(
    () => new Set(value.features.map((feature) => feature.type)),
    [value.features]
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = catalogueDefs.filter((feature) => {
      if (!needle) return true;
      return (
        featureLabel(feature).toLowerCase().includes(needle) ||
        feature.typeName.toLowerCase().includes(needle)
      );
    });

    return CATEGORY_LABELS.map(([category, label]) => {
      const features = matches.filter((feature) => feature.category === category);
      return {
        label,
        features,
        selectedCount: features.filter((feature) => selectedTypes.has(feature.typeName)).length,
      };
    }).filter((group) => group.features.length > 0);
  }, [catalogueDefs, query, selectedTypes]);

  const matchCount = groups.reduce((total, group) => total + group.features.length, 0);

  const toggle = (feature: TFeatureDef) => {
    onChange({
      ...value,
      features: selectedTypes.has(feature.typeName)
        ? value.features.filter((current) => current.type !== feature.typeName)
        : [...value.features, makeFeatureValue(feature)],
    });
  };

  return (
    <div className="flex flex-col gap-3 pb-1 mr-2">
      {headerSlot &&
        createPortal(
          <CatalogueSearch
            query={query}
            onQueryChange={setQuery}
            total={catalogueDefs.length}
            disabled={disabled}
          />,
          headerSlot
        )}

      <p className="text-sm text-gray-500">
        Any eFEL feature can be extracted from {def.label}. The {def.featureDefs.length} it is
        normally extracted with are selected by default.
      </p>

      <p className="border-neutral-2 border-b pb-2 text-xs text-gray-400">
        <span className="text-primary-9 font-semibold">{selectedTypes.size} selected</span>
        {query
          ? ` · ${matchCount} of ${catalogueDefs.length} match`
          : ` of ${catalogueDefs.length}`}
      </p>

      {groups.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={`No feature matches “${query.trim()}”`}
        />
      ) : (
        <div id="feature-catalogue" className="flex flex-col gap-3">
          {groups.map((group) => (
            // one card per category, so a group stays a single readable object while filtering
            <section
              key={group.label}
              id={`feature-catalogue-section__${kebabCase(group.label)}`}
              // no overflow-hidden on the card: it clips the sticky header against the rounded
              // corners as it moves. The header and the list round their own outer edges instead.
              className="border-gray-100 border bg-white shadow-md"
            >
              {/* sticky so the group a row belongs to is readable at any scroll position */}
              <h5
                className={cn(
                  'sticky top-0 z-10 flex items-baseline justify-between gap-2 px-3 py-2',
                  // solid, not translucent: it is sticky, so rows must not read through it
                  'border-gray-200  border-b bg-gray-100',
                  'text-lg font-semibold tracking-wider text-gray-500 uppercase'
                )}
              >
                {group.label}
                <span className="text-lg font-normal tracking-normal text-gray-400 normal-case">
                  {group.selectedCount}/{group.features.length}
                </span>
              </h5>
              <ul
                id={`feature-catalogue-list__${kebabCase(group.label)}`}
                className="flex flex-col overflow-hidden rounded-b-lg py-1"
              >
                {group.features.map((feature) => (
                  <CatalogueRow
                    key={feature.typeName}
                    feature={feature}
                    isSelected={selectedTypes.has(feature.typeName)}
                    docUrl={docUrlFor(feature)}
                    disabled={disabled}
                    onToggle={() => toggle(feature)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Opens {@link FeatureCatalogue} in the panel column. */
function AddFeatureButton({
  def,
  catalogueDefs,
  value,
  onChange,
  disabled,
  docUrlFor,
}: {
  def: TProtocolDef;
  catalogueDefs: TFeatureDef[];
  value: TProtocolValue;
  onChange: (next: TProtocolValue) => void;
  disabled: boolean;
  docUrlFor: (feature: TFeatureDef) => string | null;
}) {
  const panelKey = `${def.typeName}:catalogue`;
  const { isOpen, toggle, portal } = usePanel(panelKey);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label="Add features"
        aria-expanded={isOpen}
        title="Add features"
        onClick={() => toggle(`${def.label} features`)}
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full transition-colors',
          'duration-150 disabled:opacity-50',
          isOpen
            ? 'text-primary-9 bg-white shadow-sm ring-2 ring-white/60'
            : 'bg-white/15 text-white hover:bg-white/25'
        )}
      >
        <RiAddLine className="size-4" />
      </button>
      {portal(
        <FeatureCatalogue
          def={def}
          catalogueDefs={catalogueDefs}
          value={value}
          onChange={onChange}
          disabled={disabled}
          docUrlFor={docUrlFor}
        />
      )}
    </>
  );
}

function FeatureRow({
  def,
  value,
  panelKey,
  onChange,
  onRemove,
  onReset,
  disabled,
  docUrl,
  figureUrl,
  renderField,
}: {
  def: TFeatureDef | undefined;
  value: TFeatureValue;
  panelKey: string;
  onChange: (next: TFeatureValue) => void;
  onRemove: () => void;
  onReset: () => void;
  disabled: boolean;
  docUrl: string | null;
  figureUrl: string | null;
  renderField: TRenderField;
}) {
  const label = def ? featureLabel(def) : value.type;
  const settingsOpen = useIsSettingsPanelOpen(panelKey);

  return (
    <li
      className={cn(
        'group flex items-center gap-2 rounded-full px-3 py-1.5',
        'transition-colors duration-150 hover:bg-white/15',
        // the row it belongs to stays lit while its form is open in the other column
        settingsOpen && 'bg-white/20'
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-white">{label}</span>
        {docUrl && (
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`eFEL documentation for ${label}`}
            className="shrink-0 text-white/70 transition-colors hover:text-white"
          >
            <LinkOutlined />
          </a>
        )}
      </span>

      <SettingsButton
        panelKey={panelKey}
        title={`${label} settings`}
        disabled={disabled}
        className={cn(
          'flex size-7 items-center justify-center rounded-full transition-colors',
          'text-white/70 group-hover:bg-white group-hover:text-primary-9'
        )}
      >
        <SettingsForm description={def?.description ?? null}>
          <EFeatureFigure url={figureUrl} label={label} />
          <SettingsFields
            fields={def?.overrideFields ?? []}
            state={value as Record<string, ConfigValue>}
            setState={(next) => onChange(next as TFeatureValue)}
            renderField={renderField}
            disabled={disabled}
            onReset={onReset}
          />
        </SettingsForm>
      </SettingsButton>

      {!disabled && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="shrink-0 text-white/70 transition-colors hover:text-white"
        >
          <CloseOutlined />
        </button>
      )}
    </li>
  );
}

/**
 * One protocol.
 *
 * Every protocol on offer is rendered, selected or not: the checkbox decides whether it is part
 * of the extraction, so the card doubles as the catalogue rather than hiding unselected
 * protocols behind a separate picker.
 */
export function ProtocolCard({
  def,
  catalogueDefs,
  value,
  expanded,
  onToggleSelected,
  onToggleExpanded,
  onChange,
  onResetFeatures,
  disabled,
  discoveredAmplitudes,
  docUrlFor,
  figureUrlFor,
  renderField,
}: {
  def: TProtocolDef;
  /** every eFEL feature, offered by the catalogue panel behind the card's plus button */
  catalogueDefs: TFeatureDef[];
  /** undefined when the protocol is not part of the selection */
  value: TProtocolValue | undefined;
  expanded: boolean;
  onToggleSelected: (selected: boolean) => void;
  onToggleExpanded: () => void;
  onChange: (next: TProtocolValue) => void;
  onResetFeatures: () => void;
  disabled: boolean;
  discoveredAmplitudes: number[] | undefined;
  docUrlFor: (feature: TFeatureDef) => string | null;
  figureUrlFor: (feature: TFeatureDef) => string | null;
  renderField: TRenderField;
}) {
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const settingsOpen = useIsSettingsPanelOpen(def.typeName);
  const selected = value !== undefined;

  // the protocol's own features first, then the rest of the catalogue: a selection can hold a
  // feature added from the catalogue, and its fields are only described there
  const featureDefByType = useMemo(
    () =>
      new Map([...catalogueDefs, ...def.featureDefs].map((feature) => [feature.typeName, feature])),
    [catalogueDefs, def.featureDefs]
  );

  const settingsFields = [...def.timingFields, ...def.overrideFields];

  return (
    <section
      id={`protocol-card-${def.typeName}`}
      className={cn(
        'rounded-lg border transition-all duration-200',
        selected
          ? 'border-primary-9 bg-primary-9 text-white hover:shadow-md'
          : 'border-neutral-2 hover:border-primary-8 bg-white hover:bg-gray-50 hover:shadow-sm',
        settingsOpen && 'ring-primary-8 shadow-md ring-2'
      )}
    >
      <header className="flex items-start gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <h4 className={cn('truncate font-bold', selected ? 'text-white' : 'text-primary-9')}>
            {def.label}
          </h4>
          {def.description && (
            <p className={cn('text-xs', selected ? 'text-white/70' : 'line-clamp-2 text-gray-500')}>
              {def.description}
            </p>
          )}
        </button>

        {selected && value && (
          <SettingsButton
            light
            panelKey={def.typeName}
            title={`${def.label} settings`}
            disabled={disabled}
            className={cn(
              'flex size-7 items-center justify-center rounded-full transition-colors',
              'hover:bg-white hover:text-primary-9'
            )}
          >
            <SettingsForm description={def.description}>
              <div className="flex flex-col gap-1.5">
                <span className="text-primary-9 text-sm font-semibold">
                  Extraction amplitudes (nA)
                </span>
                <AmplitudeSettings
                  value={value}
                  onChange={onChange}
                  discoveredAmplitudes={discoveredAmplitudes}
                  disabled={disabled}
                />
              </div>
              <SettingsFields
                fields={settingsFields}
                state={value as Record<string, ConfigValue>}
                setState={(next) => onChange(next as TProtocolValue)}
                renderField={renderField}
                disabled={disabled}
                // only what this form owns — the timings, the detection knobs and the
                // amplitudes above them. The feature list belongs to the card in the middle
                // column and has its own "Reset features list"; wiping it from here read as
                // the settings form silently deleting the user's selection
                onReset={() =>
                  onChange({
                    ...makeFilledProtocolValue(def, discoveredAmplitudes),
                    features: value.features,
                  })
                }
              />
            </SettingsForm>
          </SettingsButton>
        )}

        <Checkbox
          disabled={disabled}
          checked={selected}
          aria-label={`Extract features from ${def.label}`}
          onChange={(event) => onToggleSelected(event.target.checked)}
        />

        <button
          type="button"
          aria-label={expanded ? `Collapse ${def.label}` : `Expand ${def.label}`}
          aria-expanded={expanded}
          onClick={onToggleExpanded}
          className={cn('shrink-0', selected ? 'text-white' : 'text-primary-9')}
        >
          {expanded ? (
            <RiArrowDownSLine className="size-5" />
          ) : (
            <RiArrowRightSLine className="size-5" />
          )}
        </button>
      </header>

      {expanded && !(selected && value) && (
        <div className="px-3 pb-3">
          <div className="border-neutral-2 rounded-md border px-3 py-2">
            <p className="pb-1.5 text-xs text-gray-500">
              Features extracted once this protocol is selected
            </p>
            <ul className="flex flex-wrap gap-1">
              {def.featureDefs.map((feature) => (
                <li
                  key={feature.typeName}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {featureLabel(feature)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {selected && value && expanded && (
        <div className="px-3 pb-3">
          <div className="rounded-md border border-white/20 px-3 py-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setFeaturesOpen((current) => !current)}
              aria-expanded={featuresOpen}
            >
              <span className="text-sm text-white/70">Select features</span>
              <RiArrowDownSLine
                className={cn(
                  'size-4 text-white/70 transition-transform',
                  !featuresOpen && '-rotate-90'
                )}
              />
            </button>

            {featuresOpen && (
              <>
                {value.features.length === 0 ? (
                  <p className="py-2 text-xs text-white/60">No features selected yet.</p>
                ) : (
                  <ul className="-mx-1 flex flex-col gap-0.5">
                    {value.features.map((feature, index) => {
                      const featureDef = featureDefByType.get(feature.type);
                      return (
                        <FeatureRow
                          // a protocol holds at most one of each feature class
                          key={feature.type}
                          def={featureDef}
                          value={feature}
                          panelKey={`${def.typeName}:${feature.type}`}
                          disabled={disabled}
                          docUrl={featureDef ? docUrlFor(featureDef) : null}
                          figureUrl={featureDef ? figureUrlFor(featureDef) : null}
                          renderField={renderField}
                          onReset={() =>
                            onChange({
                              ...value,
                              features: value.features.map((current, position) =>
                                position === index && featureDef
                                  ? makeFeatureValue(featureDef)
                                  : current
                              ),
                            })
                          }
                          onChange={(next) =>
                            onChange({
                              ...value,
                              features: value.features.map((current, position) =>
                                position === index ? next : current
                              ),
                            })
                          }
                          onRemove={() =>
                            onChange({
                              ...value,
                              features: value.features.filter((_, position) => position !== index),
                            })
                          }
                        />
                      );
                    })}
                  </ul>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onResetFeatures}
                    className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white disabled:opacity-50"
                  >
                    <ReloadOutlined /> Reset features list
                  </button>
                  <AddFeatureButton
                    def={def}
                    catalogueDefs={catalogueDefs}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    docUrlFor={docUrlFor}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
