import type { CSSProperties } from 'react';

type LinkIconProps = {
  className?: string;
  style?: CSSProperties;
};

export default function DoneIcon({ className, style }: LinkIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="1em"
      height="1em"
      viewBox="-0.5 -0.5 13 13"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="6" cy="6" r="6" fill="currentColor" />
    </svg>
  );
}
