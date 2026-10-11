/* The Learn page's icons, from the design (OBI Learn · Course stacked): 16px line icons. */

type IconProps = React.SVGProps<SVGSVGElement>;

const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.13333,
} as const;

export function FreeCoursesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        {...LINE}
        strokeLinejoin="round"
        d="M8 2.533 14.667 5.733 8 8.933 1.333 5.733 8 2.533Z"
      />
      <path
        {...LINE}
        strokeLinecap="round"
        d="M4.133 7.467v3.266c0 1.067 1.734 1.934 3.867 1.934s3.867-.867 3.867-1.934V7.467"
      />
    </svg>
  );
}

export function TeachIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        {...LINE}
        d="M3.067 2.667h9.866c.59 0 1.067.477 1.067 1.066v5.534c0 .589-.478 1.066-1.067 1.066H3.067A1.067 1.067 0 0 1 2 9.267V3.733c0-.589.478-1.066 1.067-1.066Z"
      />
      <path
        {...LINE}
        strokeLinecap="round"
        d="M8 10.333v2.8m0 0H5.733m2.267 0h2.267M5.067 5.467h4M5.067 7.6h2.666"
      />
    </svg>
  );
}

export function GlossaryIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        {...LINE}
        strokeLinejoin="round"
        d="M8 4.333c-1-1-2.333-1.466-4.667-1.466v8.666c2.334 0 3.667.467 4.667 1.467 1-1 2.333-1.467 4.667-1.467V2.867C10.333 2.867 9 3.333 8 4.333Z"
      />
      <path {...LINE} d="M8 4.333V13" />
    </svg>
  );
}

export function TutorialsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <circle {...LINE} cx="8" cy="8" r="5.733" />
      <path {...LINE} strokeLinejoin="round" d="M10.2 5.8 8.8 8.8 5.8 10.2 7.2 7.2 10.2 5.8Z" />
    </svg>
  );
}

export function FeaturesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        {...LINE}
        strokeLinejoin="round"
        d="M8 2.267 9.333 6.067 13.133 7.4 9.333 8.733 8 12.533 6.667 8.733 2.867 7.4 6.667 6.067 8 2.267Z"
      />
    </svg>
  );
}
