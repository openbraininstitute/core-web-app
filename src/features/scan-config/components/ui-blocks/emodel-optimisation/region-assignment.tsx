'use client';

import { RiArrowRightSLine } from '@remixicon/react';
import { useEffect } from 'react';

import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

type Props = {
  /** the `emodel_optimisation_parameters` root element schema (source of the section-list choices) */
  rootSchema: IEModelOptimisationParameters;
  /** value of the `emodel_optimisation_parameters` config key */
  value: ConfigValue;
  /** writes the next value back to the `emodel_optimisation_parameters` config key */
  onChange: (next: ConfigValue) => void;
  /** currently selected section-list choice (`name`), or '' when the drawer is closed */
  selectedRegionChoice: string;
  /** selects a section-list choice, opening the adjacent ion-channel-models drawer */
  setSelectedRegionChoice: (choice: string) => void;
};

/**
 * "Region Assignment" tab of the E-Model optimisation parameters.
 *
 * Renders the section-list `choices` declared by `base_parameters` in display order as cards,
 * matching the block-dictionary variant picker. Each available card carries an arrow that toggles
 * the adjacent ion-channel-models drawer: clicking opens it for that choice, clicking the open one
 * again closes it. Unavailable choices are dimmed and surface their `disabled_reason` in a tooltip.
 */
export function RegionAssignment({
  rootSchema,
  selectedRegionChoice,
  setSelectedRegionChoice,
}: Props) {
  const choices = [...rootSchema.properties.base_parameters.choices].sort(
    (a, b) => a.display_order - b.display_order
  );

  useEffect(() => {
    log('log', 'Region Assignment choices', choices);
  }, [choices]);

  return (
    <div className="flex flex-col items-center gap-2 overflow-y-auto p-4">
      {choices.map((choice) => {
        const isSelected = choice.name === selectedRegionChoice;

        return (
          <Tooltip key={choice.name}>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={!choice.available}
                aria-pressed={isSelected}
                aria-expanded={isSelected}
                // toggle: reopening the selected card closes the drawer
                onClick={() => setSelectedRegionChoice(isSelected ? '' : choice.name)}
                className={cn(
                  'flex min-h-25 w-full items-center gap-3 rounded-xl border border-gray-200 p-5 text-left',
                  'cursor-pointer hover:bg-white hover:shadow-xs',
                  { 'border-primary-8 bg-white shadow-xs': isSelected },
                  { 'cursor-not-allowed opacity-50': !choice.available }
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-primary-9 block text-lg font-bold">{choice.label}</span>
                  <MarkdownDescription className="mt-3">{choice.description}</MarkdownDescription>
                </div>
                <RiArrowRightSLine
                  aria-hidden
                  className={cn(
                    'size-5 shrink-0 text-gray-400 transition-transform duration-300',
                    isSelected && 'rotate-90 text-primary-8'
                  )}
                />
              </button>
            </TooltipTrigger>
            {!choice.available && choice.disabled_reason && (
              <TooltipContent
                avoidCollisions
                hideWhenDetached
                align="center"
                side="right"
                className={cn(
                  'text-white shadow-bnb max-w-2xs min-w-2xs rounded-md ',
                  'bg-primary-8 px-4 py-2 text-base text-wrap ',
                  'overflow-y-auto max-h-50 primary-scrollbar'
                )}
                arrowClassName="bg-primary-8"
              >
                {choice.disabled_reason}
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}
