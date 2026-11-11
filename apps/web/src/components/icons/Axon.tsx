import type { SVGProps } from 'react';

export function AxonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={64}
      height={64}
      viewBox="0 0 64 64"
      fill="none"
      {...props}
    >
      <title>Axon</title>
      <circle cx={32} cy={10} r={5} fill="currentColor" />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.8}
        d="M32 15c0 7-4 12-10 19-5 6-7 13-7 22"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={2.2}
        d="M22 34c-4-3-7-6-10-10M22 34c5 2 10 5 15 8"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={2}
        d="M16 48c-4 3-7 7-9 11M15 56c5 1 9 3 12 6M15 56c-3 4-5 6-7 7"
      />
    </svg>
  );
}
