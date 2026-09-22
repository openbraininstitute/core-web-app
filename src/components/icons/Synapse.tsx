import type { SVGProps } from 'react';

/**
 * Chemical synapse: an axon swelling into the presynaptic terminal,
 * neurotransmitters crossing the cleft, and the postsynaptic membrane.
 *
 * Pure vector on a 24-unit grid, so it stays sharp at any size (verified
 * legible down to 14px). Size it with `font-size` (defaults to `1em`) or by
 * passing `width`/`height`/`className`. Recolor with `color` or a Tailwind
 * `text-*` class — every stroke and fill is `currentColor`.
 *
 * Decorative by default. For a meaningful icon pass
 * `role="img" aria-label="Synapse" aria-hidden={false}`.
 */
export function SynapseIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* axon, running into the terminal */}
      <path
        d="M3 3.3C4.8 5.7 6.3 7.9 8.3 10.6"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      {/* presynaptic terminal, flat active zone facing the cleft */}
      <path d="M10.8 6.4C7.3 6.4 4.3 8.9 4.3 12s3 5.6 6.5 5.6Z" fill="currentColor" />
      {/* postsynaptic membrane */}
      <path
        d="M20.7 2.9C16.4 5.6 14.7 8.7 14.7 12s1.7 6.4 6 9.1"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      {/* neurotransmitters crossing the synaptic cleft */}
      <g fill="currentColor">
        <circle cx={12.2} cy={9.2} r={0.82} />
        <circle cx={12.2} cy={12} r={0.82} />
        <circle cx={12.2} cy={14.8} r={0.82} />
      </g>
    </svg>
  );
}
