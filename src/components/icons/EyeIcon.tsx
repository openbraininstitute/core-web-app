import { CSSProperties, SVGProps } from 'react';

type EyeIconProps = {
  className?: string;
  style?: CSSProperties;
};

/** Black eye on a transparant background */
export default function EyeIcon({ className, style }: EyeIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="13"
      height="9"
      viewBox="0 0 13 9"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.9564 4.14387C10.6478 1.38727 8.66974 0 6.01805 0C3.36499 0 1.3883 1.38727 0.0797097 4.14525C0.0272218 4.25639 0 4.37778 0 4.50069C0 4.6236 0.0272218 4.74499 0.0797097 4.85613C1.3883 7.61273 3.36637 9 6.01805 9C8.67112 9 10.6478 7.61273 11.9564 4.85475C12.0627 4.63114 12.0627 4.37163 11.9564 4.14387V4.14387ZM6.01805 8.00614C3.79152 8.00614 2.1613 6.87699 1.01146 4.5C2.1613 2.12301 3.79152 0.993865 6.01805 0.993865C8.24459 0.993865 9.8748 2.12301 11.0246 4.5C9.87618 6.87699 8.24597 8.00614 6.01805 8.00614ZM5.96284 2.07055C4.62112 2.07055 3.53339 3.15828 3.53339 4.5C3.53339 5.84172 4.62112 6.92945 5.96284 6.92945C7.30456 6.92945 8.39229 5.84172 8.39229 4.5C8.39229 3.15828 7.30456 2.07055 5.96284 2.07055ZM5.96284 6.04601C5.10839 6.04601 4.41683 5.35445 4.41683 4.5C4.41683 3.64555 5.10839 2.95399 5.96284 2.95399C6.81729 2.95399 7.50885 3.64555 7.50885 4.5C7.50885 5.35445 6.81729 6.04601 5.96284 6.04601Z" />
    </svg>
  );
}

/** Black outline of an eye on a transparant background */
export function EyeIconOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 512 512"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 0 0-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 0 0 0-17.47C428.89 172.28 347.8 112 255.66 112"
      />
      <circle
        cx="256"
        cy="256"
        r="80"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
    </svg>
  );
}

/** White eye icon, surrounded by a box representing a screen
 */
export function EyeIconWhiteWithinBox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="16"
      viewBox="0 0 15 16"
      fill="none"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <path
        id="Vector"
        d="M13 15.0909H2C0.899733 15.0909 0 14.1912 0 13.0909V2.09091C0 0.990645 0.899733 0.0909119 2 0.0909119H13C14.1003 0.0909119 15 0.990645 15 2.09091V13.0909C15 14.1912 14.1003 15.0909 13 15.0909ZM1.33333 3.75758V13.0909C1.33333 13.4574 1.63347 13.7576 2 13.7576H13C13.3665 13.7576 13.6667 13.4574 13.6667 13.0909V3.75758H1.33333ZM7.5 12.2576C4.35033 12.2576 2.80017 9.35791 2.75 9.22441C2.64974 9.02455 2.64974 8.80774 2.75 8.60788C2.80013 8.49069 4.35027 5.59088 7.5 5.59088C10.6497 5.59088 12.1998 8.49055 12.25 8.62405C12.3503 8.82391 12.3503 9.04071 12.25 9.24058C12.1999 9.35777 10.6497 12.2576 7.5 12.2576ZM7.5 9.59091C7.13347 9.59091 6.83333 9.29078 6.83333 8.92425C6.83333 8.55771 7.13347 8.25758 7.5 8.25758C7.86653 8.25758 8.16667 8.55771 8.16667 8.92425C8.16667 9.29078 7.86653 9.59091 7.5 9.59091ZM9.5 8.92425C9.5 7.82398 8.60027 6.92425 7.5 6.92425C6.39973 6.92425 5.5 7.82398 5.5 8.92425C5.5 10.0245 6.39973 10.9242 7.5 10.9242C8.60027 10.9242 9.5 10.0245 9.5 8.92425Z"
        fill="currentColor"
      />
    </svg>
  );
}
