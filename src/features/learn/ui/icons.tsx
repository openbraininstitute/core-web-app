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

export function LecturesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <rect {...LINE} x="1.8" y="3" width="12.4" height="8.4" rx="1.1" />
      <path {...LINE} strokeLinejoin="round" d="M6.8 5.4v3.6L9.9 7.2 6.8 5.4Z" />
      <path {...LINE} strokeLinecap="round" d="M5.4 13.4h5.2" />
    </svg>
  );
}

export function LiteratureIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        {...LINE}
        strokeLinejoin="round"
        d="M4 1.9h5.4L12.4 4.9v8.2c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1V2.9c0-.55.45-1 1-1Z"
      />
      <path {...LINE} strokeLinecap="round" d="M9.2 2v3h3M5.4 8h5.2M5.4 10.4h5.2M5.4 5.6h2" />
    </svg>
  );
}

export function ArticlesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <rect {...LINE} x="1.8" y="2.4" width="12.4" height="11.2" rx="1.1" />
      <path {...LINE} d="M4.2 5h3.6v3.4H4.2z" />
      <path {...LINE} strokeLinecap="round" d="M9.6 5.2h2.2M9.6 7.4h2.2M4.2 10.8h7.6" />
    </svg>
  );
}

export function ConferencesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <rect {...LINE} x="1.8" y="3" width="12.4" height="10.8" rx="1.1" />
      <path {...LINE} strokeLinecap="round" d="M1.8 6.4h12.4M5.2 1.8v2.4M10.8 1.8v2.4" />
      <path
        {...LINE}
        strokeLinecap="round"
        d="M4.6 9h1.2M7.4 9h1.2M10.2 9h1.2M4.6 11.4h1.2M7.4 11.4h1.2"
      />
    </svg>
  );
}

export function ShowcasesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        {...LINE}
        strokeLinejoin="round"
        d="M8 1.9 9.8 5.6l4.1.6-3 2.9.7 4.1L8 11.3l-3.6 1.9.7-4.1-3-2.9 4.1-.6L8 1.9Z"
      />
    </svg>
  );
}
