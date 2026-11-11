export function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-150 -150 300 300"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <g fill="currentcolor" stroke="currentcolor" strokeWidth="10" strokeLinejoin="round">
        <circle fill="none" cx="0" cy="0" r="60" />
        <path d="M30,0L-20,25,-20,-25Z" />
      </g>
    </svg>
  );
}
