export default function HierarchicalViewIcon({
  iconColor,
  className,
}: {
  iconColor: string;
  className?: string;
}) {
  return (
    <svg
      width="19"
      height="14"
      viewBox="0 0 19 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M19 0V1H0V0H19Z" fill={iconColor} />
      <path d="M19 6V7H5V6H19Z" fill={iconColor} />
      <path d="M19 12V13H5V12H19Z" fill={iconColor} />
      <path
        d="M3 6.5C3 7.32843 2.32843 8 1.5 8C0.671573 8 0 7.32843 0 6.5C0 5.67157 0.671573 5 1.5 5C2.32843 5 3 5.67157 3 6.5Z"
        fill={iconColor}
      />
      <path
        d="M3 12.5C3 13.3284 2.32843 14 1.5 14C0.671573 14 0 13.3284 0 12.5C0 11.6716 0.671573 11 1.5 11C2.32843 11 3 11.6716 3 12.5Z"
        fill={iconColor}
      />
    </svg>
  );
}
