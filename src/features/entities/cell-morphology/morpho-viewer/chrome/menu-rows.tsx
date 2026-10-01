import {
  MenuRow,
  MenuSlider,
  ViewerSwitch,
} from '@/features/scan-config/components/color-by/chrome-menu';
import { cn } from '@/utils/css-class';

import { HelpButton } from '../help/help-button';

import type { ReactNode } from 'react';
import type { HelpKey } from '../help/help-text';

export const ICON = 'size-4 shrink-0';

/** A menu section's title with its "?", and what goes at the other end of the row. */
export function SectionTitle({
  title,
  topic,
  className,
  children,
}: {
  title: string;
  topic: HelpKey;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between text-sm font-semibold text-primary-9',
        className
      )}
      data-help-anchor
    >
      <span className="flex items-center">
        {title}
        <HelpButton topic={topic} title={title} />
      </span>
      {children}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="m-0 px-2 text-xs italic">{children}</p>;
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pt-2 pb-1 text-xs uppercase tracking-wide text-neutral-400">
      {children}
    </div>
  );
}

function Label({ title, topic }: { title: string; topic: HelpKey }) {
  return (
    <span className="flex items-center">
      {title}
      <HelpButton topic={topic} title={title} />
    </span>
  );
}

/** A row whose label has a "?", the card of which comes up beside the row. */
export function HelpRow({
  title,
  topic,
  icon,
  disabled,
  className,
  children,
}: {
  title: string;
  topic: HelpKey;
  icon: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-help-anchor>
      <MenuRow
        label={<Label title={title} topic={topic} />}
        icon={icon}
        disabled={disabled}
        className={className}
      >
        {children}
      </MenuRow>
    </div>
  );
}

export function ToggleRow({
  title,
  topic,
  icon,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  topic: HelpKey;
  icon: ReactNode;
  checked: boolean;
  onChange(value: boolean): void;
  disabled?: boolean;
}) {
  return (
    <HelpRow title={title} topic={topic} icon={icon} disabled={disabled}>
      <ViewerSwitch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </HelpRow>
  );
}

export function SliderRow({
  title,
  topic,
  ...slider
}: {
  title: string;
  topic: HelpKey;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange(value: number): void;
  format(value: number): string;
  disabled?: boolean;
}) {
  return (
    <div data-help-anchor>
      <MenuSlider label={<Label title={title} topic={topic} />} {...slider} />
    </div>
  );
}
