/* eslint-disable react/jsx-props-no-spreading */
import type { SVGProps } from 'react';

/** Stroked chevron that scales with `font-size`; the older `ChevronRight` is a filled 6×11 glyph. */
export function ChevronRightStroke(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="m10 8l4 4l-4 4"
      />
    </svg>
  );
}
