import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { cn } from '@/utils/css-class';

export type DetailViewVariant = 'light' | 'onPrimary';

export function detailViewVariantFromGroup(group: EntityTypeGroup): DetailViewVariant {
  return group === EntityTypeGroup.Simulations ? 'light' : 'onPrimary';
}

export function detailViewLabelClass(variant: DetailViewVariant) {
  return variant === 'onPrimary' ? 'text-primary-3 uppercase' : 'text-neutral-4 uppercase';
}

export function detailViewValueClass(variant: DetailViewVariant) {
  return variant === 'onPrimary' ? 'text-white' : 'text-primary-7';
}

export function detailViewHeadingClass(variant: DetailViewVariant, size: 'xl' | '2xl' | '3xl' = '3xl') {
  const sizeClass =
    size === 'xl' ? 'text-xl' : size === '2xl' ? 'text-2xl' : 'text-3xl';
  return cn(
    'font-bold',
    sizeClass,
    variant === 'onPrimary' ? 'text-white' : 'text-primary-8'
  );
}

export function detailViewLinkClass(variant: DetailViewVariant) {
  return variant === 'onPrimary'
    ? 'font-bold text-white hover:text-primary-2'
    : 'font-bold text-primary-8 hover:text-primary-7';
}

export function detailViewPanelBorderClass(variant: DetailViewVariant) {
  return variant === 'onPrimary' ? 'border-white/20' : 'border-neutral-200';
}

export function detailViewCardBorderClass(variant: DetailViewVariant) {
  return variant === 'onPrimary' ? 'border-white/20' : 'border-neutral-2';
}

/** White inset panel for tables and dense UI on the blue detail background */
export function detailViewInsetPanelClass(variant: DetailViewVariant) {
  return variant === 'onPrimary' ? 'rounded-lg border border-neutral-2 bg-white p-4' : '';
}

export function detailViewPaginationClass(variant: DetailViewVariant) {
  return variant === 'onPrimary' ? 'detail-view-pagination-on-primary' : '';
}

export function detailViewPillTabsListClass(
  variant: DetailViewVariant,
  className?: string
) {
  return cn(
    'inline-flex h-10 w-fit p-0',
    variant === 'onPrimary'
      ? 'gap-0 border border-white/20 bg-transparent shadow-none'
      : 'bg-white shadow-md',
    className
  );
}

export function detailViewPillTabsTriggerClass(
  variant: DetailViewVariant,
  className?: string
) {
  return cn(
    'max-w-max h-10 px-4 py-3 text-base select-none',
    variant === 'onPrimary'
      ? 'text-[#adcdf2] hover:text-white data-[state=active]:bg-primary-8 data-[state=active]:font-bold data-[state=active]:text-white'
      : 'text-primary-8 data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:font-bold data-[state=active]:text-white',
    className
  );
}

/** Segmented tab buttons (tabbed-page) on the blue detail panel */
export function detailViewTabbedTabButtonClass(variant: DetailViewVariant, active: boolean) {
  if (variant === 'onPrimary') {
    return cn(
      'rounded-none border border-white/20 bg-transparent text-[#adcdf2] shadow-none',
      'hover:bg-primary-8/60 hover:text-white',
      active && 'bg-primary-8 font-bold text-white'
    );
  }
  return cn('rounded-none', active && 'bg-primary-9 text-white');
}

export function detailViewTabbedEmptyClass(variant: DetailViewVariant) {
  return cn(
    'flex w-full items-center justify-center rounded-2xl border p-5 select-none',
    variant === 'onPrimary' ? 'border-white/20 text-white' : 'border-neutral-2 text-primary-8'
  );
}

export function detailViewTabbedContentClass(variant: DetailViewVariant) {
  return cn('mt-5 min-h-0', variant === 'onPrimary' && detailViewInsetPanelClass(variant));
}
