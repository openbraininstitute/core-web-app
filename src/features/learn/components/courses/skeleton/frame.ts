import { cn } from '@/utils/css-class';

/**
 * The skeleton figure's box: as tall as the Learn page's card asks outside its course, and in it a
 * framed one, as tall as the course's other 3D figures and a little more; beside a panel, shorter on
 * a narrow screen, where it sits under the panel.
 */
export function frameClass(embedded: boolean, size: 'full' | 'side' = 'full'): string {
  return cn(
    'relative w-full overflow-hidden rounded-xl bg-[#0b0e14]',
    embedded
      ? 'h-(--learn-figure-h,340px)'
      : cn('border border-slate-800', size === 'side' ? 'h-[300px] md:h-[440px]' : 'h-[440px]')
  );
}
