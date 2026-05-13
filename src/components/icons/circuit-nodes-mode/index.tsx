import type { CSSProperties } from 'react';
import type { DisplayMode } from '@/features/circuit-nodes/types';

type Props = {
  mode: DisplayMode;
  className?: string;
  style?: CSSProperties;
  size?: number;
};

const PATHS: Record<DisplayMode, { d: string; label: string }> = {
  collapsed: { d: 'M1.067 11.2 H13.333 V14.933 H1.067 Z', label: 'Collapsed' },
  half: { d: 'M1.067 6.934 H13.334 V14.934 H1.067 Z', label: 'Half height' },
  full: { d: 'M1.067 1.066 H13.334 V14.933 H1.067 Z', label: 'Full height' },
};

export default function CircuitNodesModeIcon({ mode, className, style, size = 16 }: Props) {
  const { d, label } = PATHS[mode];
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 14 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <rect
        x="0.267"
        y="0.267"
        width="13.867"
        height="15.467"
        rx="1.361"
        stroke="currentColor"
        strokeWidth="0.533"
        fill="none"
      />
      <path d={d} fill="currentColor" />
    </svg>
  );
}
