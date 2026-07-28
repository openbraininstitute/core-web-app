'use client';

import { CloseOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { RiArrowDownSLine } from '@remixicon/react';
import { Checkbox, Empty, Popover } from 'antd';
import { useMemo, useState } from 'react';

import { cn } from '@/utils/css-class';

import { makeFeatureValue, mergeAmplitudeOptions } from './helpers';

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

/** A feature is identified by its class name; a protocol holds at most one of each. */
function hasFeature(protocol: TProtocolValue, typeName: string): boolean {
  return protocol.features.some((feature) => feature.type === typeName);
}

/** eFEL keys are what scientists recognise; the humanised class name is only a fallback. */
function featureLabel(def: TFeatureDef): string {
  return def.efelName ?? def.label;
}

function FieldRow({
  fieldKey,
  paramSchema,
  state,
  setState,
  renderField,
}: {
  fieldKey: string;
  paramSchema: ParamSchema;
  state: Record<string, ConfigValue>;
  setState: (next: Record<string, ConfigValue>) => void;
  renderField: TRenderField;
}) {
  const extras = paramSchema as unknown as Record<string, unknown>;
  const { units, title } = extras;

  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-baseline gap-1.5">
        <span className="text-sm text-gray-500">
          {typeof title === 'string' ? title : fieldKey}
        </span>
        {typeof units === 'string' && <span className="text-xs text-gray-400">({units})</span>}
      </span>
      {renderField({ fieldKey, paramSchema, state, setState })}
    </div>
  );
}

function AddFeatureButton({
  def,
  protocol,
  onAdd,
  disabled,
  docUrlFor,
}: {
  def: TProtocolDef;
  protocol: TProtocolValue;
  onAdd: (feature: TFeatureValue) => void;
  disabled: boolean;
  docUrlFor: (feature: TFeatureDef) => string | null;
}) {
  const [open, setOpen] = useState(false);

  const available = useMemo(
    () => def.featureDefs.filter((feature) => !hasFeature(protocol, feature.typeName)),
    [def.featureDefs, protocol]
  );

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
              {available.map((feature) => {
                const docUrl = docUrlFor(feature);
                return (
                  <li key={feature.typeName} className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex-1 truncate px-2 py-1.5 text-left hover:bg-gray-50"
                      onClick={() => {
                        onAdd(makeFeatureValue(feature));
                        setOpen(false);
                      }}
                    >
                      {featureLabel(feature)}
                    </button>
                    {docUrl && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`eFEL documentation for ${featureLabel(feature)}`}
                        className="text-primary-8 px-1"
                      >
                        <LinkOutlined />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      }
    >
      <button
        type="button"
        disabled={disabled}
        className="text-primary-8 flex items-center gap-1 text-sm disabled:opacity-50"
      >
        <PlusOutlined /> Add feature
      </button>
    </Popover>
  );
}

function FeatureRow({
  def,
  value,
  onChange,
  onRemove,
  disabled,
  docUrl,
  figureUrl,
  renderField,
}: {
  def: TFeatureDef | undefined;
  value: TFeatureValue;
  onChange: (next: TFeatureValue) => void;
  onRemove: () => void;
  disabled: boolean;
  docUrl: string | null;
  figureUrl: string | null;
  renderField: TRenderField;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = def ? featureLabel(def) : value.type;

  return (
    <li className="border-neutral-2 rounded border bg-white">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 text-left"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <RiArrowDownSLine
            className={cn('size-4 transition-transform', expanded && 'rotate-180')}
          />
          <span className="text-primary-9 truncate font-medium">{label}</span>
        </button>

        {docUrl && (
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`eFEL documentation for ${label}`}
            className="text-primary-8"
          >
            <LinkOutlined />
          </a>
        )}

        {!disabled && (
          <button type="button" aria-label={`Remove ${label}`} onClick={onRemove}>
            <CloseOutlined className="text-primary-8!" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-neutral-2 flex flex-col gap-3 border-t px-3 py-2">
          {def?.description && <p className="text-xs text-gray-500">{def.description}</p>}
          {figureUrl && (
            // biome-ignore lint/performance/noImgElement: remote eFEL figure, not a local asset
            <img
              src={figureUrl}
              alt={`eFEL illustration for ${label}`}
              className="max-w-full rounded"
              loading="lazy"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            {(def?.overrideFields ?? []).map(([fieldKey, fieldSchema]) => (
              <FieldRow
                key={fieldKey}
                fieldKey={fieldKey}
                paramSchema={fieldSchema}
                state={value as Record<string, ConfigValue>}
                setState={(next) => onChange(next as TFeatureValue)}
                renderField={renderField}
              />
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export function ProtocolCard({
  def,
  value,
  onChange,
  onRemove,
  disabled,
  discoveredAmplitudes,
  docUrlFor,
  figureUrlFor,
  renderField,
}: {
  def: TProtocolDef | undefined;
  value: TProtocolValue;
  onChange: (next: TProtocolValue) => void;
  onRemove: () => void;
  disabled: boolean;
  discoveredAmplitudes: number[] | undefined;
  docUrlFor: (feature: TFeatureDef) => string | null;
  figureUrlFor: (feature: TFeatureDef) => string | null;
  renderField: TRenderField;
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

  const toggleAmplitude = (amplitude: number, include: boolean) => {
    if (include) {
      setAmplitudes([...value.extraction_amplitudes, [amplitude, false]]);
      return;
    }
    setAmplitudes(value.extraction_amplitudes.filter(([current]) => current !== amplitude));
  };

  const toggleValidation = (amplitude: number, isValidation: boolean) => {
    setAmplitudes(
      value.extraction_amplitudes.map(
        ([current, previous]): TExtractionAmplitude =>
          current === amplitude ? [current, isValidation] : [current, previous]
      )
    );
  };

  const featureDefByType = useMemo(
    () => new Map((def?.featureDefs ?? []).map((feature) => [feature.typeName, feature])),
    [def?.featureDefs]
  );

  const fieldGroups = [def?.timingFields ?? [], def?.overrideFields ?? []].filter(
    (group) => group.length > 0
  );

  return (
    <section className="border-neutral-2 flex flex-col gap-4 rounded-lg border bg-gray-50 p-3">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-primary-9 truncate text-base font-bold">
            {def?.label ?? value.type}
          </h4>
          {def?.description && <p className="text-xs text-gray-500">{def.description}</p>}
        </div>
        {!disabled && (
          <button
            type="button"
            aria-label={`Remove ${def?.label ?? value.type}`}
            onClick={onRemove}
          >
            <CloseOutlined className="text-primary-8!" />
          </button>
        )}
      </header>

      <div className="flex flex-col gap-1.5">
        <span className="text-primary-9 text-sm font-semibold">Extraction amplitudes (nA)</span>
        {amplitudeOptions.length === 0 ? (
          <p className="text-xs text-gray-500">
            No amplitudes discovered for this protocol in the selected recordings.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {amplitudeOptions.map((amplitude) => {
              const isSelected = selectedByAmplitude.has(amplitude);
              return (
                <li key={amplitude} className="flex items-center gap-4">
                  <Checkbox
                    disabled={disabled}
                    checked={isSelected}
                    onChange={(event) => toggleAmplitude(amplitude, event.target.checked)}
                  >
                    {amplitude}
                  </Checkbox>
                  {isSelected && (
                    <Checkbox
                      disabled={disabled}
                      checked={selectedByAmplitude.get(amplitude) === true}
                      onChange={(event) => toggleValidation(amplitude, event.target.checked)}
                    >
                      <span className="text-xs text-gray-500">Use for validation</span>
                    </Checkbox>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {fieldGroups.map((group) => (
        <div key={group.map(([fieldKey]) => fieldKey).join('-')} className="grid grid-cols-2 gap-3">
          {group.map(([fieldKey, fieldSchema]) => (
            <FieldRow
              key={fieldKey}
              fieldKey={fieldKey}
              paramSchema={fieldSchema}
              state={value as Record<string, ConfigValue>}
              setState={(next) => onChange(next as TProtocolValue)}
              renderField={renderField}
            />
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-primary-9 text-sm font-semibold">
            Features ({value.features.length})
          </span>
          {def && !disabled && (
            <AddFeatureButton
              def={def}
              protocol={value}
              disabled={disabled}
              docUrlFor={docUrlFor}
              onAdd={(feature) => onChange({ ...value, features: [...value.features, feature] })}
            />
          )}
        </div>

        {value.features.length === 0 ? (
          <p className="text-xs text-gray-500">No features selected yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {value.features.map((feature, index) => {
              const featureDef = featureDefByType.get(feature.type);
              return (
                <FeatureRow
                  // features are unique per protocol, so the class name is a stable key
                  key={feature.type}
                  def={featureDef}
                  value={feature}
                  disabled={disabled}
                  docUrl={featureDef ? docUrlFor(featureDef) : null}
                  figureUrl={featureDef ? figureUrlFor(featureDef) : null}
                  renderField={renderField}
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
      </div>
    </section>
  );
}
