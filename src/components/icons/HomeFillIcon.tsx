export default function HomeFillIcon({
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
        d="M6 0L0 4.5V12H4.05V8.85C4.05 7.76954 4.91954 6.9 6 6.9C7.08047 6.9 7.95 7.76954 7.95 8.85V12H12V4.5L6 0Z"
        fill={iconColor}
      />
    </svg>
  );
}
