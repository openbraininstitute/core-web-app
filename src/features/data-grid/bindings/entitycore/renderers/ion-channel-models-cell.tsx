'use client';

import { RiExternalLinkLine } from '@remixicon/react';
import { kebabCase } from 'es-toolkit/compat';

import { config } from '@/config';
import {
  GRID_ICON_BUTTON_ACTIVE_CLASS,
  GRID_OVERLAY_Z_CLASS,
} from '@/features/data-grid/react/molecules-theme';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { ICellRendererProps } from '@/features/data-grid/react/cell-renderer-registry';

/** Cell-renderer registry key for the e-model's ion-channel-model list. */
export const ION_CHANNEL_MODELS_RENDERER = 'ionChannelModels';

interface IHasIonChannelModels {
  ion_channel_models?: Array<IonChannelModel> | null;
}

const FLAGS = [
  { key: 'is_ljp_corrected', label: 'LJP corrected' },
  { key: 'is_temperature_dependent', label: 'Temperature dependent' },
  { key: 'is_stochastic', label: 'Stochastic' },
] as const satisfies ReadonlyArray<{ key: keyof IonChannelModel; label: string }>;

function FlagChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        on ? 'border-green-600 bg-green-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-400'
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', on ? 'bg-green-500' : 'bg-gray-300')}
      />
      {label}
    </span>
  );
}

function IonChannelModelEntry({ model, href }: { model: IonChannelModel; href: string }) {
  return (
    <li className="flex flex-col gap-1.5 border-b border-gray-100 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-sm font-semibold text-primary-9" title={model.name}>
          {model.name}
        </span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${model.name} in a new tab`}
          className={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded-full',
            'bg-gray-100 text-gray-600 ring-1 ring-gray-200/70',
            GRID_ICON_BUTTON_ACTIVE_CLASS
          )}
        >
          <RiExternalLinkLine size={13} />
        </a>
      </div>

      {model.description ? (
        <ExpandableText
          text={model.description}
          collapsedLines={2}
          className="text-xs leading-4 text-gray-500 wrap-break-word"
          btnWrapperClassName="mt-1"
        >
          {({ isExpanded, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={isExpanded}
              className="text-[11px] font-medium text-primary-6 hover:text-primary-7"
            >
              {isExpanded ? 'See less' : 'See more'}
            </button>
          )}
        </ExpandableText>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {FLAGS.map((flag) => (
          <FlagChip key={flag.key} on={Boolean(model[flag.key])} label={flag.label} />
        ))}
      </div>
    </li>
  );
}

export function IonChannelModelsCell({ row }: ICellRendererProps<IHasIonChannelModels>) {
  const { virtualLabId, projectId } = useWorkspace();
  const models = (row?.ion_channel_models ?? []).filter(Boolean);

  if (models.length === 0) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;

  const [first, ...rest] = models;
  const hrefFor = (model: IonChannelModel) =>
    `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(model.type)}/${model.id}/overview`;

  return (
    <div className="flex h-full w-full items-center gap-1.5">
      <span className="min-w-0 truncate text-primary-8" title={first.name}>
        {first.name}
      </span>
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Show all ${models.length} ion channel models`}
              className={cn(
                'inline-flex h-6 min-w-6 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2',
                'bg-gray-100 text-[11px] font-medium text-gray-600 shadow-sm ring-1 ring-gray-200/70',
                GRID_ICON_BUTTON_ACTIVE_CLASS,
                'hover:text-white focus-visible:text-white'
              )}
            >
              +{rest.length}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={6}
            className={cn(
              GRID_OVERLAY_Z_CLASS,
              'w-96 rounded-2xl border-gray-100 bg-white p-4 shadow-[0_10px_34px_-8px_rgba(16,24,40,0.28)]'
            )}
          >
            <span className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
              Ion channel models
            </span>
            <ul className="mt-1 max-h-72 overflow-y-auto secondary-scrollbar">
              {models.map((model) => (
                <IonChannelModelEntry key={model.id} model={model} href={hrefFor(model)} />
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
