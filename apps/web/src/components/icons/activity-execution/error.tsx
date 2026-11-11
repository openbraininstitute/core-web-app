import type { CSSProperties } from 'react';

type LinkIconProps = {
  className?: string;
  style?: CSSProperties;
};

export default function ErrorIcon({ className, style }: LinkIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="1em"
      height="1em"
      viewBox="0 0 11 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.2414 2.44745L6.25862 0.197723C5.7919 -0.0659077 5.21922 -0.0659077 4.75249 0.197723L0.769739 2.44745C0.294862 2.7133 0.000745311 3.21054 5.65648e-06 3.75027V8.24973C-0.00147593 8.78726 0.288186 9.28378 0.758626 9.55255L4.74138 11.8023C5.2081 12.0659 5.78078 12.0659 6.24751 11.8023L10.2303 9.55255C10.7051 9.28671 10.9993 8.78946 11 8.24973V3.75027C11.0015 3.21273 10.7118 2.71622 10.2414 2.44745ZM9.48275 8.24969L5.5 10.4994L1.51725 8.24969V3.75023L5.5 1.5005L9.48275 3.75023V8.24969Z"
        fill="currentColor"
      />
      <path
        d="M6.25864 8.06221C6.25864 9.06184 4.7414 9.06184 4.7414 8.06221C4.7414 7.06258 6.25864 7.06258 6.25864 8.06221Z"
        fill="currentColor"
      />
      <path d="M4.7414 3.37528H6.25864V6.18744H4.7414V3.37528Z" fill="currentColor" />
    </svg>
  );
}
