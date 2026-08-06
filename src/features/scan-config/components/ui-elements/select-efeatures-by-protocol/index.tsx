'use client';

import { Alert, Checkbox, Empty } from 'antd';
import { useMemo, useState } from 'react';

import {
  extractRecordingIds,
  useElectricalCellRecordingProperties,
} from '@/features/scan-config/components/hooks/electrical-cell-recording-properties';
import { useFieldError } from '@/features/scan-config/components/hooks/field-errors';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';

import {
  collectSelectionErrors,
  efelDocUrl,
  efelFigureUrl,
  listProtocolDefs,
  makeFilledProtocolValue,
  parseSelectionValue,
} from './helpers';
import { ProtocolCard, type TRenderField } from './protocol-card';

import type { Config, ConfigSchema, ConfigValue, ParamSchema } from '@/features/scan-config/types';
import type { TFeatureDef, TProtocolDef, TProtocolValue } from './types';

/**
 * Publishes one validation error into the shared field-errors atom.
 *
 * A component per error rather than one call for all of them, because `useFieldError` keys on a
 * single path — and because unmounting one is what clears it once that error is resolved.
 */
function FieldErrorRegistrar({ path, message }: { path: string; message: string }) {
  useFieldError(path, message);
  return null;
}

/** How many placeholder cards to show; roughly the protocol count of a typical recording set. */
const SKELETON_CARD_COUNT = 4;

/**
 * Placeholders shaped like the collapsed protocol card — same border, padding and the title,
 * description, checkbox and chevron slots — so the list does not reflow when the protocols
 * arrive.
 */
function ProtocolCardSkeletons() {
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => index).map((index) => (
        <li key={index} className="border-neutral-2 rounded-lg border bg-white">
          <div className="flex items-start gap-2 px-3 py-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton className="size-5 shrink-0" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * `select_efeatures_by_protocol` — the whole per-protocol selection behind one widget.
 *
 * Every protocol obi-one can model is listed; the checkbox on each card decides whether it takes
 * part in the extraction. Which protocols are *offered*, and the step amplitudes each one
 * suggests, come from `/declared/mapped-electrical-cell-recording-properties` for the chosen
 * recordings rather than from the schema alone.
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
  errorPathPrefix,
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
  errorPathPrefix?: string;
}) {
  const workspace = useWorkspace();
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());

  const selection = useMemo(() => parseSelectionValue(value), [value]);
  const protocolDefs = useMemo(() => listProtocolDefs(paramSchema), [paramSchema]);

  const {
    data: recordingProperties,
    isLoading,
    isError,
  } = useElectricalCellRecordingProperties({ config, schema, workspace });

  // recordings are chosen in this editor, not on a browse page before it, so the selection lives
  // in the config rather than in the route's session entity
  const selectedRecordingIds = useMemo(() => extractRecordingIds(config), [config]);
  const hasSelectedRecordings = selectedRecordingIds.length > 0;

  const discoveredProtocols = recordingProperties?.Protocols;

  /**
   * Only offer protocols the recordings contain. Until the endpoint answers there is nothing
   * trustworthy to list — showing all 27 schema protocols would present a working picker built
   * on no evidence — so the list stays empty and the loading or error state explains why.
   */
  const offeredDefs = useMemo(() => {
    // whatever is already selected stays on screen no matter what the endpoint says: the
    // selection is what gets submitted, so it must remain visible (and checked) while the
    // properties query is in flight, after it fails, and once the editor goes read-only on
    // generate — a card that disappears reads as a selection that was silently dropped
    const shown = new Set(selection.protocols.map((protocol) => protocol.type));
    for (const name of discoveredProtocols ?? []) shown.add(name);

    return protocolDefs.filter((def) => shown.has(def.typeName));
  }, [protocolDefs, discoveredProtocols, selection.protocols]);

  // keyed off every protocol the schema knows, not just the offered ones: a stored selection can
  // name a protocol the current recordings no longer report, and it still has to be validated
  const defsByType = useMemo(
    () => new Map(protocolDefs.map((def) => [def.typeName, def])),
    [protocolDefs]
  );

  const selectionErrors = useMemo(
    () => collectSelectionErrors(selection, defsByType),
    [selection, defsByType]
  );
  const errorPrefix = errorPathPrefix ?? ScanConfigUIElementDict.SelectEFeaturesByProtocol;

  const selectedByType = useMemo(
    () => new Map(selection.protocols.map((protocol) => [protocol.type, protocol])),
    [selection.protocols]
  );

  const amplitudesFor = (def: TProtocolDef) =>
    recordingProperties?.AmplitudesByProtocol?.[def.typeName];

  const commit = (protocols: TProtocolValue[]) => {
    setState({
      ...state,
      [fieldKey]: {
        // preserve the discriminator obi-one round-trips on this object
        type: selection.type ?? 'SelectEFeaturesByProtocol',
        protocols,
      } as ConfigValue,
    });
  };

  const replaceProtocol = (typeName: string, next: TProtocolValue) => {
    commit(selection.protocols.map((protocol) => (protocol.type === typeName ? next : protocol)));
  };

  const toggleSelected = (def: TProtocolDef, selected: boolean) => {
    if (!selected) {
      commit(selection.protocols.filter((protocol) => protocol.type !== def.typeName));
      return;
    }

    // a protocol with no features extracts nothing and is reported as invalid, so selecting one
    // takes its full feature set; removing what is not wanted is the easier direction
    setExpandedProtocols((current) => new Set(current).add(def.typeName));
    commit([...selection.protocols, makeFilledProtocolValue(def, amplitudesFor(def))]);
  };

  /**
   * Select-all / deselect-all over the offered protocols.
   *
   * Checked state is derived from the selection rather than remembered, so unchecking a single
   * protocol below turns this off by itself instead of the two disagreeing.
   */
  const allSelected =
    offeredDefs.length > 0 && offeredDefs.every((def) => selectedByType.has(def.typeName));
  const someSelected = offeredDefs.some((def) => selectedByType.has(def.typeName));

  const toggleAll = (enabled: boolean) => {
    if (!enabled) {
      commit([]);
      setExpandedProtocols(new Set());
      return;
    }

    commit(offeredDefs.map((def) => makeFilledProtocolValue(def, amplitudesFor(def))));
    setExpandedProtocols(new Set(offeredDefs.map((def) => def.typeName)));
  };

  const docUrlFor = (feature: TFeatureDef) => efelDocUrl(schema, feature.efelName);
  const figureUrlFor = (feature: TFeatureDef) => efelFigureUrl(schema, feature.schema);

  return (
    <div
      className="flex flex-col gap-3"
      data-scan-config-block-element={ScanConfigUIElementDict.SelectEFeaturesByProtocol}
    >
      {selectionErrors.map(({ key, message }) => (
        <FieldErrorRegistrar key={key} path={`${errorPrefix}/${key}`} message={message} />
      ))}

      <Checkbox
        disabled={disabled || offeredDefs.length === 0}
        checked={allSelected}
        indeterminate={someSelected && !allSelected}
        onChange={(event) => toggleAll(event.target.checked)}
      >
        Automatically fill the features and protocols
      </Checkbox>

      {isError && (
        <Alert
          type="warning"
          showIcon
          message="Could not read the protocols for the selected recordings"
          description="Protocols are discovered from the recordings' NWB files; without them there is nothing to configure here."
        />
      )}

      {isLoading && offeredDefs.length === 0 && <ProtocolCardSkeletons />}

      {!isLoading && !isError && offeredDefs.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            hasSelectedRecordings
              ? 'No protocols found in the selected recordings.'
              : 'Select electrophysiology recordings to discover the protocols they contain.'
          }
        />
      )}

      {offeredDefs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {offeredDefs.map((def) => (
            <li key={def.typeName}>
              <ProtocolCard
                def={def}
                value={selectedByType.get(def.typeName)}
                expanded={expandedProtocols.has(def.typeName)}
                disabled={disabled}
                discoveredAmplitudes={amplitudesFor(def)}
                docUrlFor={docUrlFor}
                figureUrlFor={figureUrlFor}
                renderField={renderField}
                onToggleSelected={(selected) => toggleSelected(def, selected)}
                onToggleExpanded={() =>
                  setExpandedProtocols((current) => {
                    const next = new Set(current);
                    if (!next.delete(def.typeName)) next.add(def.typeName);
                    return next;
                  })
                }
                onChange={(next) => replaceProtocol(def.typeName, next)}
                onResetFeatures={() =>
                  replaceProtocol(def.typeName, makeFilledProtocolValue(def, amplitudesFor(def)))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
