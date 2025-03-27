export default function CloneStrokeIcon({
  iconColor,
  className,
}: {
  iconColor: string;
  className?: string;
}) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10 9.6V8.8C10.66 8.8 11.2 8.25999 11.2 7.6V2C11.2 1.34001 10.66 0.8 10 0.8H4.4C3.74001 0.8 3.2 1.34001 3.2 2H2.4C2.4 0.896 3.296 0 4.4 0H10C11.104 0 12 0.896 12 2V7.6C12 8.704 11.104 9.6 10 9.6Z"
        fill={iconColor}
      />
      <path
        d="M7.6 12H2C0.896 12 0 11.104 0 10V4.4C0 3.296 0.896 2.4 2 2.4H7.6C8.704 2.4 9.6 3.296 9.6 4.4V10C9.6 11.104 8.704 12 7.6 12ZM2 3.2C1.34001 3.2 0.8 3.74001 0.8 4.4V10C0.8 10.66 1.34001 11.2 2 11.2H7.6C8.25999 11.2 8.8 10.66 8.8 10V4.4C8.8 3.74001 8.25999 3.2 7.6 3.2H2Z"
        fill={iconColor}
      />
    </svg>
  );
}
