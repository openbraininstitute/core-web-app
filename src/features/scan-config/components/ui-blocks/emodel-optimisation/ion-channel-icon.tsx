/**
 * Simplified ion-channel glyph: two parallel lines forming the pore, each flaring outward into a
 * curve at both ends - the channel's narrow neck opening into its wider vestibule. Stroke style to
 * match Remix Icon's 24x24 / currentColor line-icon convention used elsewhere in this UI.
 */
export function IonChannelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <title>Ion channel</title>
      <path d="M5.5,4 C7.5,5.5 9.5,6.5 9.5,8 L9.5,16 C9.5,17.5 7.5,18.5 5.5,20" />
      <path d="M18.5,4 C16.5,5.5 14.5,6.5 14.5,8 L14.5,16 C14.5,17.5 16.5,18.5 18.5,20" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
