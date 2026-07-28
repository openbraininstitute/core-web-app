'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Alert, Empty, Popover, Spin } from 'antd';
import { useMemo, useState } from 'react';

import { useElectricalCellRecordingProperties } from '@/features/scan-config/components/hooks/electrical-cell-recording-properties';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import {
  efelDocUrl,
  efelFigureUrl,
  listProtocolDefs,
  makeProtocolValue,
  parseSelectionValue,
} from './helpers';
import { ProtocolCard, type TRenderField } from './protocol-card';

import type { Config, ConfigSchema, ConfigValue, ParamSchema } from '@/features/scan-config/types';
import type { TFeatureDef, TProtocolValue, TSelectEFeaturesValue } from './types';

/**
 * `select_efeatures_by_protocol` — the whole per-protocol selection behind one widget.
 *
 * The protocols on offer come from the recordings the user picked, not from the schema alone:
 * the schema lists every protocol obi-one can model, while
 * `/declared/mapped-electrical-cell-recording-properties` reports which ones the chosen NWBs
 * actually contain, along with the step amplitudes found in them.
 */
export function SelectEFeaturesByProtocol({
  fieldKey,
  value,
  state,
  setState,
  paramSchema,
  schema,
  config,
  disabled,
  renderField,
}: {
  fieldKey: string;
  value: ConfigValue;
  state: Record<string, ConfigValue>;
  setState: (next: Record<string, ConfigValue>) => void;
  paramSchema: ParamSchema;
  schema: ConfigSchema;
  config: Config;
  disabled: boolean;
  renderField: TRenderField;
}) {
  const workspace = useWorkspace();
  const [addOpen, setAddOpen] = useState(false);

  const selection = useMemo(() => parseSelectionValue(value), [value]);
  const protocolDefs = useMemo(() => listProtocolDefs(paramSchema), [paramSchema]);

  const {
    data: recordingProperties,
    isLoading,
    isError,
  } = useElectricalCellRecordingProperties({ config, schema, workspace });

  const protocolDefByType = useMemo(
    () => new Map(protocolDefs.map((def) => [def.typeName, def])),
    [protocolDefs]
  );

  /**
   * Offer only protocols the recordings contain. Before the endpoint answers — or if it
   * fails — fall back to the full schema list so the widget stays usable rather than
   * appearing to have nothing to add.
   */
  const offeredDefs = useMemo(() => {
    const discovered = recordingProperties?.Protocols;
    if (!discovered || discovered.length === 0) return protocolDefs;

    const allowed = new Set(discovered);
    const matching = protocolDefs.filter((def) => allowed.has(def.typeName));
    return matching.length > 0 ? matching : protocolDefs;
  }, [protocolDefs, recordingProperties?.Protocols]);

  const availableDefs = useMemo(() => {
    const selected = new Set(selection.protocols.map((protocol) => protocol.type));
    return offeredDefs.filter((def) => !selected.has(def.typeName));
  }, [offeredDefs, selection.protocols]);

  const commit = (next: TSelectEFeaturesValue) => {
    setState({
      ...state,
      [fieldKey]: {
        // preserve the discriminator obi-one round-trips on this object
        type: selection.type ?? 'SelectEFeaturesByProtocol',
        protocols: next.protocols,
      } as ConfigValue,
    });
  };

  const updateProtocol = (index: number, next: TProtocolValue) => {
    commit({
      ...selection,
      protocols: selection.protocols.map((current, position) =>
        position === index ? next : current
      ),
    });
  };

  const removeProtocol = (index: number) => {
    commit({
      ...selection,
      protocols: selection.protocols.filter((_, position) => position !== index),
    });
  };

  const docUrlFor = (feature: TFeatureDef) => efelDocUrl(schema, feature.efelName);
  const figureUrlFor = (feature: TFeatureDef) => efelFigureUrl(schema, feature.schema);

  return (
    <div
      className="flex flex-col gap-3"
      data-scan-config-block-element={ScanConfigUIElementDict.SelectEFeaturesByProtocol}
    >
      {isError && (
        <Alert
          type="warning"
          showIcon
          message="Could not read the protocols for the selected recordings"
          description="Every protocol obi-one supports is listed instead, and no amplitudes are suggested."
        />
      )}

      {isLoading && (
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <Spin size="small" /> Reading protocols from the selected recordings…
        </span>
      )}

      {selection.protocols.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No protocols selected yet. Add one to choose its amplitudes and features."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {selection.protocols.map((protocol, index) => (
            <li key={protocol.type}>
              <ProtocolCard
                def={protocolDefByType.get(protocol.type)}
                value={protocol}
                disabled={disabled}
                discoveredAmplitudes={recordingProperties?.AmplitudesByProtocol?.[protocol.type]}
                docUrlFor={docUrlFor}
                figureUrlFor={figureUrlFor}
                renderField={renderField}
                onChange={(next) => updateProtocol(index, next)}
                onRemove={() => removeProtocol(index)}
              />
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <Popover
          open={addOpen}
          onOpenChange={setAddOpen}
          trigger="click"
          placement="bottomLeft"
          content={
            <div className="max-h-80 w-72 overflow-y-auto">
              {availableDefs.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No further protocols available for these recordings"
                />
              ) : (
                <ul className="flex flex-col">
                  {availableDefs.map((def) => (
                    <li key={def.typeName}>
                      <button
                        type="button"
                        className="w-full truncate px-2 py-1.5 text-left hover:bg-gray-50"
                        onClick={() => {
                          commit({
                            ...selection,
                            protocols: [...selection.protocols, makeProtocolValue(def)],
                          });
                          setAddOpen(false);
                        }}
                      >
                        {def.label}
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
            className="text-primary-8 flex w-fit items-center gap-1 text-sm font-semibold"
          >
            <PlusOutlined /> Add protocol
          </button>
        </Popover>
      )}
    </div>
  );
}
