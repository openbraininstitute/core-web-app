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
