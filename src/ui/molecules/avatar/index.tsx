import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';

export interface IAvatarPerson {
  readonly initials: string;
  readonly colour: string;
  readonly agent: boolean;
}

export interface IAvatarProps {
  readonly actor: IAvatarPerson;
  readonly size?: number;
  readonly title?: string;
  readonly ring?: boolean;
  readonly stacked?: boolean;
}

export const agentRadiusOf = (size: number): number => (size <= 26 ? 8 : 9);

export function AgentBadge({ size, colour }: { readonly size: number; readonly colour: string }) {
  const badge = Math.max(12, Math.round(size * 0.42));
  return (
    <span
      className="absolute grid place-items-center rounded-full bg-white shadow-[0_0_0_1.5px_currentColor]"
      style={{ width: badge, height: badge, top: -badge / 3, right: -badge / 3, color: colour }}
      aria-hidden="true"
    >
      <Icon name="sparkle" size={Math.round(badge * 0.72)} stroke={2.4} />
    </span>
  );
}

export function Avatar({ actor, size = 30, title, ring = false, stacked = false }: IAvatarProps) {
  const style = {
    width: size,
    height: size,
    background: actor.colour,
    borderRadius: actor.agent ? agentRadiusOf(size) : 999,
    fontSize: size <= 28 ? 10 : 11,
    '--ring': actor.colour,
    ...(stacked ? { border: '2px solid var(--color-white)', marginLeft: -8 } : {}),
  } as CSSProperties;
  return (
    <span
      className={cn(
        'relative inline-flex flex-none items-center justify-center leading-none font-bold text-white',
        ring && 'writing-ring'
      )}
      style={style}
      title={title}
    >
      {actor.initials.length > 0 ? (
        actor.initials
      ) : (
        <Icon name="sparkle" size={Math.round(size * 0.43)} stroke={2.2} />
      )}
      {actor.agent ? <AgentBadge size={size} colour={actor.colour} /> : null}
    </span>
  );
}
