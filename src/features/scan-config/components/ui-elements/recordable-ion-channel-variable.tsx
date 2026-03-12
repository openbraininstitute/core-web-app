'use client';

import { LinkOutlined, LoadingOutlined } from '@ant-design/icons';
import { RiArrowDownSLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { obioneApi } from '@/api/one/utils';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type {
  Config,
  ConfigSchema,
  SelectRecordableIonChannelVariable as SelectRecordableIonChannelVariableSchema,
} from '@/features/scan-config/types';

type IonChannelVariable = {
  ion_channel_id: string | null;
  channel_name: string | null;
  variable_name: string;
  unit: string;
};

type VariableValue = {
  ion_channel_id: string | null;
  variable_name: string;
  type: string;
};

type ChannelGroup = {
  key: string;
  channel_name: string;
  entity_id: string | null;
  variables: IonChannelVariable[];
};

const SEPARATOR = '::';

function encodeValue(channelKey: string, variableName: string): string {
  return `${channelKey}${SEPARATOR}${variableName}`;
}

function extractIonChannelIds(config: Config): string[] {
  const ionChannelModels = config.ion_channel_models;
  if (!ionChannelModels || typeof ionChannelModels === 'string') return [];

  const ids: Array<string> = [];
  for (const entry of Object.values(ionChannelModels)) {
    if (isPlainObject(entry)) {
      const model = entry.ion_channel_model;
      if (isPlainObject(model) && typeof model.id_str === 'string' && model.id_str) {
        ids.push(model.id_str);
      }
    }
  }
  return ids;
}

function resolveEndpoint(schema: ConfigSchema, endpointKey: string): string | null {
  for (const [key, endpointPath] of Object.entries(schema.property_endpoints)) {
    if (key === endpointKey) {
      return endpointPath;
    }
  }
  return null;
}

function buildChannelGroups(recordableVars: Record<string, IonChannelVariable[]>): ChannelGroup[] {
  return Object.entries(recordableVars).map(([key, variables]) => {
    const first = variables[0];
    return {
      key,
      channel_name: first?.channel_name ?? key,
      entity_id: first?.ion_channel_id ?? null,
      variables,
    };
  });
}

function SelectedDisplay({
  group,
  variable,
}: {
  group: ChannelGroup;
  variable: IonChannelVariable;
}) {
  return (
    <span className="flex items-start flex-col bg-white! gap-1.5 text-left">
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        <span className="shrink-0 text-sm text-gray-400">Channel</span>
        <span className="shrink-0 font-semibold text-base text-primary-9">
          {group.channel_name}
        </span>
        {group.entity_id && (
          <a
            href={`/app/entity/${group.entity_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex items-center justify-center text-primary-9 min-w-6!',
              'min-h-6! px-1 border-gray-200 bg-white',
              'transition-colors hover:bg-gray-100 hover:border-gray-300 rounded-full',
              'hover:text-primary-9 pointer-events-auto [&_svg]:pointer-events-auto'
            )}
            aria-label={`View ion channel ${group.channel_name}`}
          >
            <LinkOutlined />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-400">Variable</span>
        <span className="font-semibold text-base text-primary-9">{variable.variable_name}</span>
        {variable.unit && <span className="text-xs text-gray-400">({variable.unit})</span>}
      </div>
    </span>
  );
}

function ChannelHeader({
  group,
  isExpanded,
  onToggle,
}: {
  group: ChannelGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full cursor-pointer items-center justify-between px-2 py-3',
        'rounded-sm bg-white select-none transition-colors hover:bg-gray-50'
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="truncate text-base font-bold text-primary-9">{group.channel_name}</span>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {group.entity_id && (
          <a
            href={`/app/entity/${group.entity_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex items-center justify-center size-6 gap-1 rounded-full border',
              'border-gray-200 bg-white transition-colors hover:bg-gray-100 hover:border-gray-300 hover:text-primary-8'
            )}
            aria-label={`View ion channel ${group.channel_name}`}
          >
            <LinkOutlined className="size-3 text-gray-400" />
          </a>
        )}
        <RiArrowDownSLine
          className={cn(
            'size-5 shrink-0 text-gray-400 transition-transform hover:text-primary-8',
            isExpanded && 'rotate-180'
          )}
        />
      </div>
    </button>
  );
}

export function SelectRecordableIonChannelVariable({
  value,
  onChange,
  disabled,
  config,
  paramSchema,
  schema,
}: {
  value: VariableValue | null | undefined;
  onChange: (v: VariableValue | null) => void;
  disabled: boolean;
  config: Config;
  paramSchema: SelectRecordableIonChannelVariableSchema;
  schema: ConfigSchema;
}) {
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const ionChannelIds = useMemo(() => extractIonChannelIds(config), [config]);
  const endpoint = useMemo(() => resolveEndpoint(schema, 'IonChannelModel'), [schema]);
  const valueTypeConst = paramSchema.properties?.type?.const;

  const { data: channelGroups = [], isLoading } = useQuery({
    queryKey: ['mapped-ion-channel-properties', { endpoint, ionChannelIds }],
    queryFn: async () => {
      const api = await obioneApi();
      return api.get<Record<string, Record<string, IonChannelVariable[]>>>(`/declared${endpoint}`, {
        queryParams: { ion_channel_ids: ionChannelIds },
      });
    },
    select: (resp) => {
      const recordableVars = resp?.[paramSchema.property];
      if (!recordableVars) return [];
      return buildChannelGroups(recordableVars);
    },
    enabled: ionChannelIds.length > 0 && !!endpoint,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const lookupMap = useMemo(() => {
    const map = new Map<string, { group: ChannelGroup; variable: IonChannelVariable }>();
    for (const group of channelGroups) {
      for (const variable of group.variables) {
        const key = encodeValue(group.key, variable.variable_name);
        map.set(key, { group, variable });
      }
    }
    return map;
  }, [channelGroups]);

  const currentEncoded = useMemo(() => {
    if (!value?.variable_name) return undefined;
    // find the matching encoded key by scanning the lookup map
    for (const [key, entry] of lookupMap) {
      if (
        entry.variable.variable_name === value.variable_name &&
        (entry.variable.ion_channel_id ?? null) === (value.ion_channel_id ?? null)
      ) {
        return key;
      }
    }
    return undefined;
  }, [value, lookupMap]);

  const resolved = currentEncoded ? (lookupMap.get(currentEncoded) ?? null) : null;

  const toggleChannel = (channelKey: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelKey)) next.delete(channelKey);
      else next.add(channelKey);
      return next;
    });
  };

  const handleValueChange = (encodedValue: string) => {
    const entry = lookupMap.get(encodedValue);
    if (!entry) return;
    onChange({
      ion_channel_id: entry.variable.ion_channel_id,
      variable_name: entry.variable.variable_name,
      type: valueTypeConst,
    });
  };

  const hasNoModels = ionChannelIds.length === 0;

  return (
    <div
      className="flex flex-col gap-1 w-full"
      data-scan-config-block-element={ScanConfigUIElementDict.SelectRecordableIonChannelVariable}
    >
      {hasNoModels && (
        <span className="text-red-500 text-sm">
          At least one ion channel model must be added before selecting a recordable variable.
        </span>
      )}
      <Select
        value={currentEncoded}
        onValueChange={handleValueChange}
        disabled={disabled || hasNoModels}
      >
        <SelectTrigger className="w-full h-auto! whitespace-normal bg-white border-gray-200">
          <SelectValue
            placeholder={
              isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-gray-400">Fetching</span> <LoadingOutlined />
                </div>
              ) : (
                'Select a variable…'
              )
            }
          >
            {resolved && <SelectedDisplay group={resolved.group} variable={resolved.variable} />}
          </SelectValue>
        </SelectTrigger>

        <SelectContent
          side="bottom"
          align="center"
          position="popper"
          className="max-h-72 bg-white! border-gray-100"
        >
          {channelGroups.map((group) => (
            <SelectGroup key={group.key}>
              <ChannelHeader
                group={group}
                isExpanded={expandedChannels.has(group.key)}
                onToggle={() => toggleChannel(group.key)}
              />
              {expandedChannels.has(group.key) && (
                <div className="ml-2 border-l-2 border-gray-300">
                  {group.variables.map((variable) => {
                    const itemValue = encodeValue(group.key, variable.variable_name);
                    return (
                      <SelectItem
                        key={itemValue}
                        value={itemValue}
                        className="pl-4 text-primary-8 hover:text-primary-7! text-base font-semibold cursor-pointer"
                        checkClassName="size-3 text-primary-8"
                      >
                        <span>{variable.variable_name}</span>
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">
                          ({variable.unit})
                        </span>
                      </SelectItem>
                    );
                  })}
                </div>
              )}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
