// The design's icon set, paths verbatim.
import type { ReactNode } from 'react';

const paths = {
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  person: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  dots: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  menu: <path d="M4 6h16M4 12h16M4 18h10" />,
  cube: <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5 12 12l8-4.5M12 12v9" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  sparkle: (
    <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" />
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  check: <path d="m5 12 5 5L20 7" />,
  sort: <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  letters: <path d="M3 18 7.5 6h1L13 18M4.6 14h6.8M15 11h5l-5 7h5" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  upload: <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  home: <path d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4z" />, // a log's main page
  page: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />, // a section
  notebook: (
    <>
      <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z" />
      <path d="M6 3v18M3.5 7.5h4M3.5 12h4M3.5 16.5h4M10 8h6" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" />
    </>
  ),
  circuit: (
    <path d="M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 6h8M7 8l4 8M17 8l-4 8" />
  ),
  morphology: (
    <path d="M12 10.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12 10.5V3M12 3 9 5M12 3l3 2M10.2 14.8 5 20M13.8 14.8 19 20M9.6 12.4 4 11" />
  ),
  emodel: <path d="M3 13h4l2-7 3 13 2-9 2 3h5" />,
  simulation: <path d="M3 5h18v12H3zM8 21h8M10 8.5l5 2.5-5 2.5z" />,
  ion_channel_model: <path d="M7 4v16M17 4v16M7 9h10M7 15h10" />,
  trace: <path d="M3 12h3l2-5 3 10 2-7 2 4h6" />,
  brain_region: (
    <path d="M8 5a4 4 0 0 0-4 4c0 2 1 3 1 5a4 4 0 0 0 7 2.5A4 4 0 0 0 19 14c0-2 1-3 1-5a4 4 0 0 0-8-1.5A4 4 0 0 0 8 5z" />
  ),
  // Text formatting; not in the design's set.
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <path d="M10 5h8M6 19h8M14 5l-4 14" />,
  strike: (
    <path d="M5 12h14M16 7.5C15.4 6 13.9 5 12 5c-2.5 0-4 1.3-4 3 0 4 8 2.5 8 7 0 1.8-1.7 3-4 3-2 0-3.6-1-4.2-2.5" />
  ),
  code: <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />,
  codeBlock: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m10 10-2 2 2 2M14 10l2 2-2 2" />
    </>
  ),
  quote: <path d="M5 7v10M9 8h10M9 12h10M9 16h6" />,
  listBullet: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  listOrdered: (
    <path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5c.4-.6 1-.9 1.6-.9.8 0 1.4.5 1.4 1.2 0 1-2.9 2.2-3 3.7h3" />
  ),
  indent: <path d="M10 6h10M10 12h10M10 18h10M4 9l3 3-3 3" />,
  outdent: <path d="M10 6h10M10 12h10M10 18h10M7 9l-3 3 3 3" />,
  heading: <path d="M6 5v14M18 5v14M6 12h12" />,
  alignLeft: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignCenter: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignRight: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  alignJustify: <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
} satisfies Record<string, ReactNode>;

export type TIconName = keyof typeof paths;

const isIconName = (name: string): name is TIconName => Object.hasOwn(paths, name);

export interface IIconProps {
  readonly name: string;
  readonly size?: number;
  readonly stroke?: number;
}

// Unknown names draw the generic cube.
export function Icon({ name, size = 16, stroke = 2 }: IIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isIconName(name) ? paths[name] : paths.cube}
    </svg>
  );
}
