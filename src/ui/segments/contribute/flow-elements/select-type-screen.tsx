'use client';

import { CloseOutlined } from '@ant-design/icons';
import { RiArrowDownSLine } from '@remixicon/react';
import { type ReactNode, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardTitle } from '@/ui/molecules/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/molecules/collapsible';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { TextPatternTransformer, urlRegex } from '@/ui/molecules/text-pattern-transformer';
import { TransformedLink } from '@/ui/molecules/text-pattern-transformer/link-item';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type TArtifactOption = {
  value: TExtendedEntitiesTypeDict;
  label: string;
  description?: string;
  icon?: ReactNode;
  enabled: boolean;
};

export interface ISelectTypeScreenProps {
  options: TArtifactOption[];
  selectedType: TExtendedEntitiesTypeDict | null;
  onSelectType: (type: TExtendedEntitiesTypeDict) => void;
}

type ArtifactTypeCardProps = {
  option: TArtifactOption;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (type: TExtendedEntitiesTypeDict) => void;
};

function ArtifactTypeCard({
  option,
  selected = false,
  disabled = false,
  onSelect,
}: ArtifactTypeCardProps) {
  return (
    <Card
      aria-disabled={disabled}
      className={cn(
        'h-full w-full rounded-xl border p-4 text-left transition-colors shadow-none bg-white!',
        {
          'hover:bg-gray-100! border-gray-200 cursor-pointer hover:shadow-xs': !disabled,
          'border-primary-8 bg-primary-0': selected && !disabled,
          'border-gray-300 cursor-not-allowed opacity-60': disabled,
        }
      )}
      onClick={
        !disabled && onSelect
          ? () => {
              onSelect(option.value);
            }
          : undefined
      }
    >
      <CardContent className="flex h-full items-stretch gap-3">
        {option.icon ? <div className="text-primary-8 mt-0.5 shrink-0">{option.icon}</div> : null}
        <div className="min-w-0 flex flex-1 flex-col">
          <CardTitle className="text-primary-9 m-0 mb-1 text-lg">{option.label}</CardTitle>
          {option.description ? (
            <CardDescription
              className={cn(
                'text-primary-7 mt-1 flex flex-1 flex-col text-sm',
                '[&>div]:flex [&>div]:flex-1 [&>div]:flex-col'
              )}
            >
              <ExpandableText
                text={option.description}
                collapsedLines={3}
                className="mt-4 flex-1"
                formatter={(content) => (
                  <TextPatternTransformer
                    regex={urlRegex}
                    component={(match) => (
                      <TransformedLink url={match} className="text-primary-5 underline!" />
                    )}
                  >
                    {content}
                  </TextPatternTransformer>
                )}
              >
                {({ isExpanded, toggle }) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle();
                    }}
                    className={cn(
                      'text-sm text-primary-8 underline! decoration-primary-8',
                      ' underline-offset-4 transition-colors hover:text-primary-5 ml-auto mt-auto flex items-end justify-end'
                    )}
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </ExpandableText>
            </CardDescription>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function SelectTypeScreen({ options, selectedType, onSelectType }: ISelectTypeScreenProps) {
  const { enabledOptions, disabledOptions } = useMemo(() => {
    const enabled = options.filter((option) => option.enabled);
    const disabled = options.filter((option) => !option.enabled);
    return { enabledOptions: enabled, disabledOptions: disabled };
  }, [options]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-5 flex w-full items-center justify-between pl-3.5">
        <h2 className="text-primary-9 text-lg font-bold">Select a type</h2>
        <button
          type="button"
          className={cn(
            'hover:bg-neutral-1 text-neutral-5 hover:text-primary-6 ',
            'flex items-center justify-center rounded-full p-2 hover:shadow-bnb'
          )}
        >
          <CloseOutlined />
        </button>
      </div>
      <Card borderless shadowless className=" flex min-h-0 flex-1 flex-col px-4 pb-4 pt-0">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto secondary-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            {enabledOptions.map((option) => {
              const isSelected = selectedType === option.value;
              return (
                <ArtifactTypeCard
                  key={option.value}
                  option={option}
                  selected={isSelected}
                  onSelect={onSelectType}
                />
              );
            })}
          </div>
          {disabledOptions.length > 0 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger
                className={cn(
                  'w-full group',
                  'text-primary-8 mb-5 flex cursor-pointer list-none items-start justify-between',
                  ' px-1 text-sm font-semibold uppercase tracking-wide'
                )}
              >
                <div className="flex flex-col items-start normal-case">
                  <h2 className="text-primary-9 text-lg font-bold  tracking-wide">Coming soon</h2>
                  <small className="text-gray-500 normal-case">
                    These artifact types are planned and will be available in future releases.
                  </small>
                </div>
                <div className="text-primary-8 text-xs normal-case ml-4 flex items-center gap-2">
                  ({disabledOptions.length} item{disabledOptions.length > 1 ? 's' : ''} )
                  <RiArrowDownSLine className="size-6 -rotate-90 transition-all ease-smooth group-data-[state=open]:rotate-0" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid grid-cols-1 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                {disabledOptions.map((option) => (
                  <ArtifactTypeCard key={option.value} option={option} disabled />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </Card>
    </div>
  );
}
