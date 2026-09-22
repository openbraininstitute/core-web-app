import type { CSSProperties } from 'react';

type LinkIconProps = {
  className?: string;
  style?: CSSProperties;
};

export default function CancelledIcon({ className, style }: LinkIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="1em"
      height="1em"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.6 3.1L8.9 1.4L6 4.3L3.1 1.4L1.4 3.1L4.3 6L1.4 8.9L3.1 10.6L6 7.7L8.9 10.6L10.6 8.9L7.7 6L10.6 3.1Z"
        fill="currentColor"
      />
    </svg>
  );
}
