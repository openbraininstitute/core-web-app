export default function FlatListViewIcon({
  iconColor,
  className,
}: {
  iconColor: string;
  className?: string;
}) {
  return (
    <svg
      width="19"
      height="13"
      viewBox="0 0 19 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M19 0V1H0V0H19Z" fill={iconColor} />
      <path d="M19 6V7H0V6H19Z" fill={iconColor} />
      <path d="M19 12V13H0V12H19Z" fill={iconColor} />
    </svg>
  );
}
