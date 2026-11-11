/** A round swatch of a colour, or of any CSS background. */
export function ColorDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ background: color }}
    />
  );
}
