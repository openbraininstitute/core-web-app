import type { CSSProperties } from 'react';

type Props = {
  className?: string;
  style?: CSSProperties;
  size?: number;
};

export default function HalfIcon({ className, style, size = 16 }: Props) {
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
      aria-label="Half height"
    >
      <title>Half height</title>
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
      <path d="M1.067 6.934 H13.334 V14.934 H1.067 Z" fill="currentColor" />
    </svg>
  );
}
