import type { SVGProps } from 'react';

/**
 * A pyramidal neuron: apical tuft, basal dendrites and an axon ending in boutons.
 *
 * Pure vector on a 64-unit grid; every stroke and fill is `currentColor`. Decorative by default.
 */
export function PyramidalNeuronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g strokeWidth={2.5}>
        <path d="M32 11C31.4 15.5 32 22 32 30V48" />
        <path d="M32 32C26 30.6 19 31 13 29" />
        <path d="M32 32C38 30.6 45 31 51 29" />
      </g>
      <g strokeWidth={1.75}>
        <path d="M32 11C30.2 8.2 28.5 6 27 3" />
        <path d="M32 11C33.8 8.2 35.5 6 37 3" />
        <path d="M31.8 19C28.5 17 25.5 15 21.5 13.5" />
        <path d="M32 16.5C35.5 14.5 38.5 12.6 42.5 11.2" />
        <path d="M32 35C26.5 37 21 40 17 44.5" />
        <path d="M32 35C37.5 37 43 40 47 44.5" />
        <path d="M32 48C29.4 51 27.5 54.5 25.5 58.5" />
        <path d="M32 48C34.6 51 36.5 54.5 38.5 58.5" />
        <path d="M32 48V60" />
      </g>
      <g strokeWidth={1.25}>
        <path d="M25 15C24.2 12.6 23.6 10.6 23.4 8.5" />
        <path d="M39 12.5C39.9 10.4 40.4 8.6 40.5 6.5" />
        <path d="M18 31C16.3 32.8 14.6 34 12.2 35" />
        <path d="M46 31C47.7 32.8 49.4 34 51.8 35" />
        <path d="M19.8 41.6C18 41.4 16.2 41.6 14.2 42.2" />
        <path d="M44.2 41.6C46 41.4 47.8 41.6 49.8 42.2" />
      </g>
      {/* axon terminal boutons */}
      <g fill="currentColor" stroke="none">
        <circle cx={25.3} cy={59.2} r={1.5} />
        <circle cx={32} cy={61} r={1.5} />
        <circle cx={38.7} cy={59.2} r={1.5} />
      </g>
    </svg>
  );
}
