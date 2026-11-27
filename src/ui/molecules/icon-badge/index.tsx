import { Badge } from '@/ui/molecules/badge';
import { Icon } from '@/ui/molecules/icon';
import { IconBadgeTone } from '@/ui/molecules/icon-badge/helpers';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TIconName } from '@/ui/molecules/icon';
import type { TIconBadgeTone } from '@/ui/molecules/icon-badge/helpers';

const TONE_CLASS: Record<TIconBadgeTone, string> = {
  [IconBadgeTone.Project]: 'border-primary-2 bg-primary-1 text-primary-8',
  // stroke, not color: circuit rows force every svg colour to primary-8
  [IconBadgeTone.Public]:
    'border-secondary-1 bg-secondary-0 text-scope-public-fg [&_svg]:stroke-scope-public-fg',
  [IconBadgeTone.Neutral]: 'border-neutral-2 bg-neutral-1 text-neutral-4 [&_svg]:stroke-neutral-4',
  [IconBadgeTone.Quiet]: 'border-transparent bg-transparent font-normal text-neutral-4',
};

/** A small rounded tag: an icon and a label in one tone; without an icon, its slot stays so labels line up. */
export function IconBadge({
  icon,
  tone,
  children,
  className,
}: {
  icon: TIconName | null;
  tone: TIconBadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      asChild
      rounded
      variant="outline"
      className={cn(
        'h-5 justify-start gap-1 px-2 py-0 text-[11px] font-semibold select-none',
        TONE_CLASS[tone],
        className
      )}
    >
      <span>
        {icon ? (
          <Icon name={icon} size={12} />
        ) : (
          <span aria-hidden="true" className="size-[12px]" />
        )}
        {children}
      </span>
    </Badge>
  );
}
