import { type TViewVariant, ViewVariant } from '@/constants';
import { EntityTypeGroup, type TEntityTypeGroup } from '@/entity-configuration/domain/group';
import { cn } from '@/utils/css-class';

export function detailViewVariantFromGroup(group: TEntityTypeGroup): TViewVariant {
  return group === EntityTypeGroup.Simulations ? ViewVariant.Light : ViewVariant.Default;
}

export function detailViewLabelClass(variant: TViewVariant) {
  return variant === ViewVariant.Default ? 'text-primary-3 uppercase' : 'text-neutral-4 uppercase';
}

export function detailViewValueClass(variant: TViewVariant) {
  return variant === ViewVariant.Default ? 'text-white' : 'text-primary-7';
}

export function detailViewHeadingClass(variant: TViewVariant, size: 'xl' | '2xl' | '3xl' = '3xl') {
  const sizeClass = size === 'xl' ? 'text-xl' : size === '2xl' ? 'text-2xl' : 'text-3xl';
  return cn(
    'font-bold',
    sizeClass,
    variant === ViewVariant.Default ? 'text-white' : 'text-primary-8'
  );
}

export function detailViewLinkClass(variant: TViewVariant) {
  return variant === ViewVariant.Default
    ? 'font-bold text-white hover:text-primary-2'
    : 'font-bold text-primary-8 hover:text-primary-7';
}

export function detailViewPanelBorderClass(variant: TViewVariant) {
  return variant === ViewVariant.Default ? 'border-white/20' : 'border-neutral-200';
}

export function detailViewCardBorderClass(variant: TViewVariant) {
  return variant === ViewVariant.Default ? 'border-white/20' : 'border-neutral-2';
}

/** White inset panel for tables and dense UI on the blue detail background */
export function detailViewInsetPanelClass(variant: TViewVariant) {
  return cn({ 'rounded-lg': variant === ViewVariant.Default });
}

/** Ant Design simple pagination on the blue detail-view panel */
export function detailViewPaginationClass(variant: TViewVariant) {
  if (variant !== ViewVariant.Default) return '';
  return cn(
    'text-white',
    // prev / next arrows
    '[&_.ant-pagination-prev]:text-white! [&_.ant-pagination-next]:text-white!',
    '[&_.ant-pagination-prev_button]:text-white! [&_.ant-pagination-next_button]:text-white!',
    // item link box
    '[&_.ant-pagination-item-link]:border-white/35! [&_.ant-pagination-item-link]:bg-transparent! [&_.ant-pagination-item-link]:text-white!',
    '[&_.ant-pagination-item-link:hover]:bg-white/10!',
    '[&_.ant-pagination-item-link_.anticon]:text-white! [&_.ant-pagination-item-link-icon]:text-white! [&_.ant-pagination-item-link_svg]:fill-current [&_.ant-pagination-item-link_svg]:text-white!',
    '[&_.ant-pagination-item-link::before]:border-white! [&_.ant-pagination-item-link::before]:text-white! [&_.ant-pagination-item-link::after]:border-white! [&_.ant-pagination-item-link::after]:text-white!',
    // disabled state
    '[&_.ant-pagination-disabled_.ant-pagination-item-link]:border-white/20! [&_.ant-pagination-disabled_.ant-pagination-item-link]:text-white/40!',
    '[&_.ant-pagination-disabled_.ant-pagination-item-link_.anticon]:text-white/40! [&_.ant-pagination-disabled_.ant-pagination-item-link_svg]:text-white/40!',
    // simple pager input + slash
    '[&_.ant-pagination-simple-pager]:text-white!',
    '[&_.ant-pagination-simple-pager_input]:border-white/35! [&_.ant-pagination-simple-pager_input]:bg-white! [&_.ant-pagination-simple-pager_input]:text-primary-8!',
    '[&_.ant-pagination-slash]:mx-1 [&_.ant-pagination-slash]:text-white! [&_.ant-pagination-simple-pager>span]:mx-1 [&_.ant-pagination-simple-pager>span]:text-white!'
  );
}

export function detailViewPillTabsListClass(variant: TViewVariant, className?: string) {
  return cn(
    'inline-flex h-10 w-fit p-0',
    variant === ViewVariant.Default
      ? 'gap-0 border border-white/20 bg-transparent shadow-none'
      : 'bg-white shadow-md',
    className
  );
}

export function detailViewPillTabsTriggerClass(variant: TViewVariant, className?: string) {
  return cn(
    'max-w-max h-10 px-4 py-3 text-base select-none',
    variant === ViewVariant.Default
      ? 'text-[#adcdf2] hover:text-white data-[state=active]:bg-primary-8 data-[state=active]:font-bold data-[state=active]:text-white'
      : 'text-primary-8 data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:font-bold data-[state=active]:text-white',
    className
  );
}

/** Segmented tab buttons (tabbed-page) on the blue detail panel */
export function detailViewTabbedTabButtonClass(variant: TViewVariant, active: boolean) {
  if (variant === ViewVariant.Default) {
    return cn(
      'rounded-none border border-white/20 bg-transparent text-[#adcdf2] shadow-none',
      'hover:bg-primary-8/60 hover:text-white',
      { 'bg-primary-8 font-bold text-white': active }
    );
  }
  return cn('rounded-none', { 'bg-primary-9 text-white': active });
}

export function detailViewTabbedEmptyClass(variant: TViewVariant) {
  return cn(
    'flex w-full items-center justify-center rounded-2xl border p-5 select-none',
    variant === ViewVariant.Default
      ? 'border-white/20 text-white'
      : 'border-neutral-2 text-primary-8'
  );
}

export function detailViewTabbedContentClass(variant: TViewVariant) {
  return cn('mt-5 min-h-0', variant === ViewVariant.Default && detailViewInsetPanelClass(variant));
}
