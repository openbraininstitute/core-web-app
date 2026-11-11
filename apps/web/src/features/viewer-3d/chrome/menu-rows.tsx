import { createElement } from 'react';

import {
  MenuRow,
  MenuSlider,
  ViewerSwitch,
} from '@/features/scan-config/components/color-by/chrome-menu';
import { cn } from '@/utils/css-class';

import { HelpButton } from '../help/help-button';

import type { ComponentType, ReactNode } from 'react';
import type { HelpText } from '../help/help-button';

export const ICON = 'size-4 shrink-0';

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

/** A label's help: the card's text, and its topic, which names it for tests. */
interface Help {
  topic: string;
  help: HelpText;
}

/** A menu section's title with its "?", and what goes at the other end of the row. */
export function SectionTitle({
  title,
  topic,
  help,
  className,
  children,
}: Help & { title: string; className?: string; children?: ReactNode }) {
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
        <HelpButton topic={topic} title={title} help={help} />
      </span>
      {children}
    </div>
  );
}

function Label({ title, topic, help }: Help & { title: string }) {
  return (
    <span className="flex items-center">
      {title}
      <HelpButton topic={topic} title={title} help={help} />
    </span>
  );
}

/** A row whose label has a "?", the card of which comes up beside the row. */
export function HelpRow({
  title,
  topic,
  help,
  icon,
  disabled,
  className,
  children,
}: Help & {
  title: string;
  icon: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-help-anchor>
      <MenuRow
        label={<Label title={title} topic={topic} help={help} />}
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
  help,
  icon,
  checked,
  onChange,
  disabled,
}: Help & {
  title: string;
  icon: ReactNode;
  checked: boolean;
  onChange(value: boolean): void;
  disabled?: boolean;
}) {
  return (
    <HelpRow title={title} topic={topic} help={help} icon={icon} disabled={disabled}>
      <ViewerSwitch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </HelpRow>
  );
}

export function SliderRow({
  title,
  topic,
  help,
  ...slider
}: Help & {
  title: string;
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
      <MenuSlider label={<Label title={title} topic={topic} help={help} />} {...slider} />
    </div>
  );
}

/** The rows and the "?" with a viewer's own help cards, each looked up by its topic. */
export function createHelpRows<K extends string>(texts: Record<K, HelpText>) {
  const bind = <P extends Help>(Row: ComponentType<P>) =>
    function WithHelp({ topic, ...props }: Omit<P, keyof Help> & { topic: K }) {
      return createElement(Row, { ...props, topic, help: texts[topic] } as unknown as P);
    };
  return {
    HelpButton: bind(HelpButton),
    SectionTitle: bind(SectionTitle),
    HelpRow: bind(HelpRow),
    ToggleRow: bind(ToggleRow),
    SliderRow: bind(SliderRow),
  };
}
