'use client';

import { LinkOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import ChevronDownIcon from '@/components/icons/ChevronDownIcon';
import {
  buildChannelGroups,
  type ChannelGroupOption,
  type ChannelVariableOption,
  encodeSelectionValue,
  type MechanismVariablesRoot,
  type TMechanismVariableType,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

export interface IonChannelSelection {
  channelName: string;
  entityId: string | null;
  sectionLists: string[];
  variable: ChannelVariableOption;
}

interface Props {
  data: MechanismVariablesRoot;
  variableType: TMechanismVariableType | TMechanismVariableType[];
  value: string | null;
  onChange: (selection: IonChannelSelection) => void;
  disabled?: boolean;
}

export function IonChannelVariableSelector({
  data,
  variableType,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const channelGroups = useMemo(() => buildChannelGroups(data, variableType), [data, variableType]);
  const lookupMap = useMemo(() => {
    const map = new Map<string, { group: ChannelGroupOption; variable: ChannelVariableOption }>();
    for (const group of channelGroups) {
      for (const variable of group.variables) {
        const key = encodeSelectionValue(group.channel_name, variable.neuron_variable);
        map.set(key, { group, variable });
      }
    }
    return map;
  }, [channelGroups]);

  const resolved = value ? (lookupMap.get(value) ?? null) : null;

  const toggleChannel = (channelName: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelName)) next.delete(channelName);
      else next.add(channelName);
      return next;
    });
  };

  const handleValueChange = (encodedValue: string) => {
    const entry = lookupMap.get(encodedValue);
    if (!entry) return;
    onChange({
      channelName: entry.group.channel_name,
      entityId: entry.group.entity_id,
      sectionLists: entry.group.section_lists,
      variable: entry.variable,
    });
  };

  return (
    <Select value={value ?? undefined} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className="w-full h-auto! whitespace-normal bg-white border-gray-200">
        <SelectValue placeholder="Select a variable…">
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
          <SelectGroup key={group.channel_name}>
            <ChannelHeader
              group={group}
              isExpanded={expandedChannels.has(group.channel_name)}
              onToggle={() => toggleChannel(group.channel_name)}
            />
            {expandedChannels.has(group.channel_name) && (
              <div className="ml-2 border-l-2 border-gray-300">
                {group.variables.map((variable) => {
                  const itemValue = encodeSelectionValue(
                    group.channel_name,
                    variable.neuron_variable
                  );
                  return (
                    <SelectItem
                      key={itemValue}
                      value={itemValue}
                      className="pl-4 text-primary-8 hover:text-primary-7! cursor-pointer"
                      checkClassName="size-3 text-primary-8"
                    >
                      {variable.neuron_variable}
                    </SelectItem>
                  );
                })}
              </div>
            )}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function SelectedDisplay({
  group,
  variable,
}: {
  group: ChannelGroupOption;
  variable: ChannelVariableOption;
}) {
  const sections = variable.section_lists.map((o) => o.section_list);

  return (
    <span className="flex items-start flex-col bg-white! gap-1.5 text-left">
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        <span className="shrink-0 text-sm text-gray-400">Channel</span>
        <span className="shrink-0 font-semibold text-primary-8">{group.channel_name}</span>
        {sections.length > 0 && <SectionListBadge sections={sections} />}
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
              'hover:text-primary-8 pointer-events-auto [&_svg]:pointer-events-auto'
            )}
            aria-label={`View ion channel ${group.channel_name}`}
          >
            <LinkOutlined />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-400">Variable</span>
        <span className="font-semibold text-primary-8">{variable.neuron_variable}</span>
      </div>
    </span>
  );
}

/**
 * a pill showing the first section name and a "+N" badge
 */
function SectionListBadge({ sections }: { sections: string[] }) {
  const remaining = sections.length - 1;

  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs capitalize text-primary-8">
      <span className="truncate">{sections[0]}</span>
      {remaining > 0 && (
        <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-medium text-primary-8">
          +{remaining}
        </span>
      )}
    </span>
  );
}

function ChannelHeader({
  group,
  isExpanded,
  onToggle,
}: {
  group: ChannelGroupOption;
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
        <span className="truncate text-sm font-semibold text-primary-8">{group.channel_name}</span>
        <span className="shrink-0 text-xs text-gray-400">[{group.section_lists.join(', ')}]</span>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {group.entity_id && (
          <Link
            href={`/app/entity/${group.entity_id}`}
            target="_blank"
            className={cn(
              'inline-flex items-center justify-center size-6 gap-1 rounded-full border',
              'border-gray-200 bg-white transition-colors hover:bg-gray-100 hover:border-gray-300 hover:text-primary-8'
            )}
            aria-label={`View ion channel ${group.channel_name}`}
          >
            <LinkOutlined className="size-3 text-gray-400" />
          </Link>
        )}
        <ChevronDownIcon
          className={cn(
            'size-3 shrink-0 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </div>
    </button>
  );
}
