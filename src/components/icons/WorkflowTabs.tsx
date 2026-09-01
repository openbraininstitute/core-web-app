/* eslint-disable react/jsx-props-no-spreading */
import type { SVGProps } from 'react';

/** Icon from Siemens Industrial Experience Icons by Siemens AG — https://github.com/siemens/ix-icons/blob/main/LICENSE.md */
export function ConfigurationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 512 512"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="m234.67 85.33l-.004 213.338h-21.333v42.666h21.333l.005 85.33h42.666l-.004-85.33h21.333v-42.666h-21.333l.004-213.338zm-128.006 0v85.355H85.331v42.645h21.333v213.333h42.667V213.33h21.333v-42.645h-21.333V85.33zm255.981.004v128h-21.333l.013 42.663h21.333v170.666h42.688V255.997h21.333l-.013-42.663h-21.333l.013-128.004z"
      />
    </svg>
  );
}

/** Icon from Carbon by IBM */
export function ResultsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="26" cy="26" r="4" fill="currentColor" />
      <path
        fill="currentColor"
        d="M10 13h2v2h-2zm0 5h2v2h-2zm0 5h2v2h-2zm4-10h8v2h-8zm0 5h8v2h-8zm0 5h4v2h-4z"
      />
      <path
        fill="currentColor"
        d="M7 28V7h3v3h12V7h3v11h2V7a2 2 0 0 0-2-2h-3V4a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v1H7a2 2 0 0 0-2 2v21a2 2 0 0 0 2 2h11v-2Zm5-24h8v4h-8Z"
      />
    </svg>
  );
}
