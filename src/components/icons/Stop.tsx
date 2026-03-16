import type { CSSProperties } from 'react';

type StopIconProps = {
  className?: string;
  style?: CSSProperties;
  fill?: string;
};

export default function StopIcon({ className, style, fill }: StopIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="1.5em"
      height="1.5em"
      viewBox="0 0 24 24"
      fill={fill || 'currentColor'}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>stop</title>
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
    </svg>
  );
}
