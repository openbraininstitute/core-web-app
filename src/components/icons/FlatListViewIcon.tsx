export default function FlatListViewIcon({
  iconColor,
  className,
}: {
  iconColor: string;
  className?: string;
}) {
  return (
    <svg
      width="120"
      height="103"
      viewBox="0 0 120 103"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M37 5H120V16H37V5Z" fill={iconColor} />
      <path d="M37 46H120V57H37V46Z" fill={iconColor} />
      <path d="M37 87H120V98H37V87Z" fill={iconColor} />
      <path
        d="M21 92.5C21 98.299 16.299 103 10.5 103C4.70101 103 0 98.299 0 92.5C0 86.701 4.70101 82 10.5 82C16.299 82 21 86.701 21 92.5Z"
        fill={iconColor}
      />
      <path
        d="M21 51.5C21 57.299 16.299 62 10.5 62C4.70101 62 0 57.299 0 51.5C0 45.701 4.70101 41 10.5 41C16.299 41 21 45.701 21 51.5Z"
        fill={iconColor}
      />
      <path
        d="M21 10.5C21 16.299 16.299 21 10.5 21C4.70101 21 0 16.299 0 10.5C0 4.70101 4.70101 0 10.5 0C16.299 0 21 4.70101 21 10.5Z"
        fill={iconColor}
      />
    </svg>
  );
}
