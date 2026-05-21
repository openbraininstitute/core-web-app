import { cn } from '@/utils/css-class';

export type EphysViewerVariant = 'light' | 'onPrimary';

export function ephysControlLabelClass(variant: EphysViewerVariant, className?: string) {
  return cn(variant === 'onPrimary' ? 'font-bold text-white' : 'text-dark font-bold', className);
}

export function ephysControlSubLabelClass(variant: EphysViewerVariant, className?: string) {
  return cn(
    'text-sm font-light',
    variant === 'onPrimary' ? 'text-white/80' : undefined,
    className
  );
}

export function ephysHeadingClass(variant: EphysViewerVariant, className?: string) {
  return cn(
    'text-xl font-bold',
    variant === 'onPrimary' ? 'text-white' : 'text-primary-9',
    className
  );
}

export function ephysSectionLabelClass(variant: EphysViewerVariant, className?: string) {
  return cn(
    'text-sm font-medium',
    variant === 'onPrimary' ? 'text-white' : undefined,
    className
  );
}
