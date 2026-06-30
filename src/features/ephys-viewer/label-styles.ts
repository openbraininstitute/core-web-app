import { type TViewVariant, ViewVariant } from '@/constants';
import { cn } from '@/utils/css-class';

export function ephysControlLabelClass(variant: TViewVariant, className?: string) {
  return cn(
    variant === ViewVariant.Default ? 'font-bold text-white' : 'text-dark font-bold',
    className
  );
}

export function ephysControlSubLabelClass(variant: TViewVariant, className?: string) {
  return cn('text-sm font-light', { 'text-white/80': variant === ViewVariant.Default }, className);
}

export function ephysHeadingClass(variant: TViewVariant, className?: string) {
  return cn(
    'text-xl font-bold',
    variant === ViewVariant.Default ? 'text-white' : 'text-primary-9',
    className
  );
}

export function ephysSectionLabelClass(variant: TViewVariant, className?: string) {
  return cn('text-sm font-medium', { 'text-white': variant === ViewVariant.Default }, className);
}

/**
 * Restyles the *closed* antd `<Select>` box so it reads on the dark (Default) background:
 * transparent box, light border and near-white text. Mirrors the dark-variant styling in
 * `trace-view-mode-toggle`. The dropdown popup renders in a body portal on its default
 * white background, so it is left untouched. Returns no overrides for the Light variant.
 */
export function ephysSelectClass(variant: TViewVariant, className?: string) {
  return cn(
    variant === ViewVariant.Default && [
      '[&_.ant-select-selector]:border-white/35! [&_.ant-select-selector]:bg-transparent!',
      '[&_.ant-select-selection-item]:text-white',
      '[&_.ant-select-selection-placeholder]:text-white/50',
      '[&_.ant-select-arrow]:text-white/70',
    ],
    className
  );
}
