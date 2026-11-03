import type { SVGProps } from 'react';

/**
 * Generated morphology locations: a soma and its dendrites, with points placed along the
 * branches.
 *
 * Pure vector on a 24-unit grid; every stroke and fill is `currentColor`. Decorative by default.
 */
export function MorphologyLocationsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx={5.2} cy={18.8} r={2.9} fill="currentColor" />
      <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        <path d="M7.3 16.7 12.6 11.4" />
        <path d="M12.6 11.4C14.2 8.6 16.4 6.2 20 4.4" />
        <path d="M12.6 11.4C15.2 11.8 17.8 13 20.4 15.4" />
        <path d="M9.6 14.4C9.2 11.4 8.2 8.8 6.2 6.2" />
      </g>
      {/* the placed locations, wider than the branches they sit on */}
      <g fill="currentColor">
        <circle cx={16.5} cy={6.7} r={1.9} />
        <circle cx={17.8} cy={13.4} r={1.9} />
        <circle cx={8.2} cy={9.4} r={1.9} />
      </g>
    </svg>
  );
}
