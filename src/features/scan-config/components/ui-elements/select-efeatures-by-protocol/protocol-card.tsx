'use client';

import {
  CloseOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { RiArrowDownSLine, RiArrowRightSLine, RiEqualizerLine } from '@remixicon/react';
import { Checkbox, Empty, Popover, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  useIsSettingsPanelOpen,
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
      setPanel((current) => (current?.key === panelKey ? null : current));
    };
  }, [panelKey, setPanel]);

  const toggle = (title: string) => setPanel(isOpen ? null : { key: panelKey, title });
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
          // the panel lives in a different column, so the trigger has to carry the open state
          // itself — otherwise nothing on the card says which settings are being edited
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

function AddFeatureButton({
  def,
  value,
  onChange,
  disabled,
}: {
  def: TProtocolDef;
  value: TProtocolValue;
  onChange: (next: TProtocolValue) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  const available = useMemo(() => {
    const selected = new Set(value.features.map((feature) => feature.type));
    return def.featureDefs.filter((feature) => !selected.has(feature.typeName));
  }, [def.featureDefs, value.features]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      content={
        <div className="max-h-80 w-72 overflow-y-auto">
          {available.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Every feature for this protocol is already selected"
            />
          ) : (
            <ul className="flex flex-col">
              {available.map((feature) => (
                <li key={feature.typeName}>
                  <button
                    type="button"
                    className="w-full truncate px-2 py-1.5 text-left hover:bg-gray-50"
                    onClick={() => {
                      onChange({
                        ...value,
                        features: [...value.features, makeFeatureValue(feature)],
                      });
                      setOpen(false);
                    }}
                  >
                    {featureLabel(feature)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
    >
      <button
        type="button"
        disabled={disabled}
        aria-label="Add feature"
        title="Add feature"
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          'bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-50'
        )}
      >
        <PlusOutlined />
      </button>
    </Popover>
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

  const featureDefByType = useMemo(
    () => new Map(def.featureDefs.map((feature) => [feature.typeName, feature])),
    [def.featureDefs]
  );

  const settingsFields = [...def.timingFields, ...def.overrideFields];

  return (
    <section
      className={cn(
        'rounded-lg border transition-all duration-200',
        selected
          ? 'border-primary-9 bg-primary-9 text-white hover:shadow-md'
          : 'border-neutral-2 hover:border-primary-8 bg-white hover:bg-gray-50 hover:shadow-sm',
        // which card the right column is currently editing
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
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
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
