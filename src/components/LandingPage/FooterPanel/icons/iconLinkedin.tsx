export default function IconLinkedin({
  iconColor = 'currentColor',
  className,
}: {
  iconColor?: string;
  className?: string;
}) {
  const fill1 = iconColor;
  const fill2 = `color-mix(in srgb, ${iconColor}, #000)`;
  const fill3 = '#fff';
  return (
    <svg
      width="2em"
      height="2em"
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <rect fill={fill3} x="2" y="2" width="252" height="252" rx="10.61" ry="10.61" />
        <path
          fill={fill2}
          d="M243.39,4c4.75,0,8.61,3.86,8.61,8.61v230.77c0,4.75-3.86,8.61-8.61,8.61H12.61c-4.75,0-8.61-3.86-8.61-8.61V12.61c0-4.75,3.86-8.61,8.61-8.61h230.77M243.39,0H12.61C5.65,0,0,5.65,0,12.61v230.77c0,6.97,5.65,12.61,12.61,12.61h230.77c6.97,0,12.61-5.65,12.61-12.61V12.61c0-6.97-5.65-12.61-12.61-12.61h0Z"
        />
      </g>
      <g>
        <path
          fill={fill1}
          d="M92.09,77.73c0,7.9-5.03,14.36-14.36,14.36-8.62,0-14.36-6.46-14.36-13.64,0-7.9,5.75-15.08,14.36-15.08s14.36,6.46,14.36,14.36Z"
        />
        <rect fill={fill1} x="63.37" y="99.27" width="28.73" height="93.36" />
        <path
          fill={fill1}
          d="M161.03,100.71c-15.08,0-23.7,8.62-27.29,14.36h-.72l-1.44-12.21h-25.85c0,7.9.72,17.24.72,28.01v61.76h28.73v-50.99c0-2.87,0-5.03.72-7.18,2.15-5.03,5.74-11.49,13.64-11.49,10.05,0,14.36,8.62,14.36,20.11v49.55h28.73v-53.14c0-26.57-13.64-38.78-31.6-38.78Z"
        />
      </g>
    </svg>
  );
}
