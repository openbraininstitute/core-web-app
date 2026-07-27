import { RiArrowDownSLine } from '@remixicon/react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

const toolbarTriggerCls = cn(
  'h-auto rounded-full border-0 bg-white px-5 py-1',
  'text-primary-9 text-sm font-bold',
  'shadow-[6px_6px_14px_0_#0000000f,-8px_-8px_20px_0_#ffffffd1]',
  'focus-visible:ring-0 focus-visible:border-0'
);

const toolbarContentCls = 'bg-white border-gray-200';
const toolbarItemCls = 'text-primary-9 text-sm data-[state=checked]:font-bold';

type Props = {
  populations: NodePopulation[];
  value: string | undefined;
  onChange: (name: string) => void;
  /** toolbar = full-width table header; chrome = compact pill for the viewer overlay */
  variant?: 'toolbar' | 'chrome';
  theme?: ViewerTheme | null;
  disabled?: boolean;
  className?: string;
  /** Portal mount for the dropdown (fullscreen-safe). */
  portalContainer?: HTMLElement | null;
};

export function PopulationSelect({
  populations,
  value,
  onChange,
  variant = 'toolbar',
  theme,
  disabled,
  className,
  portalContainer,
}: Props) {
  const chrome = variant === 'chrome';
  const panelStyle =
    chrome && theme
      ? {
          background: theme.panelBackground,
          color: theme.foreground,
          boxShadow: `0 0 0 1px ${theme.panelRing}`,
        }
      : undefined;
  const mutedStyle = chrome && theme ? { color: theme.mutedForeground } : undefined;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || populations.length === 0}>
      <SelectTrigger
        className={cn(
          chrome
            ? cn(
                'inline-flex h-auto items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur-sm transition-colors focus-visible:outline-none',
                theme
                  ? 'hover:brightness-110'
                  : 'bg-white text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-50',
                className
              )
            : cn(toolbarTriggerCls, styles.populationSelect, 'w-full min-w-0', className),
          chrome && 'border-0 shadow-none ring-0'
        )}
        style={panelStyle}
        icon={
          <RiArrowDownSLine
            className={cn('size-4 opacity-100', chrome ? undefined : 'text-primary-9')}
            style={mutedStyle}
          />
        }
      >
        {chrome ? (
          <>
            <span className={cn(!theme && 'text-neutral-400')} style={mutedStyle}>
              Population
            </span>
            <span>{value ?? '—'}</span>
          </>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent
        container={portalContainer}
        className={
          chrome ? 'rounded-xl border-gray-100 p-1 shadow-xl backdrop-blur-xl' : toolbarContentCls
        }
        style={
          chrome && theme
            ? { background: theme.panelBackground, color: theme.foreground }
            : undefined
        }
      >
        {populations.map((p) => (
          <SelectItem
            key={p.name}
            value={p.name}
            className={cn(
              chrome ? 'rounded-xl text-sm data-[state=checked]:font-semibold' : toolbarItemCls
            )}
          >
            {`${p.name} (${p.type})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
