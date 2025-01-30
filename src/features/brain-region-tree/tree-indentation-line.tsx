/**
 * the line component is added for each NavTitle with absolute position
 * the height is calculated based on the container "NavTitle" height and the bottom padding of the title
 * we added some space to the top to not be too close to the title
 * @param TreeLineBar.height is the height of the title component
 * @returns absolute positioned dashed line
 */
export default function TreeIndentationLine({ show, height }: { show: boolean; height?: number }) {
  if (!show) return null;
  return (
    <div
      className="absolute left-px w-px border-l border-dashed border-primary-4"
      style={
        height
          ? {
              top: `calc(${height}px - 0.75rem + .25rem)`,
              height: `calc(100% - ${height}px - 0.75rem + .25rem)`,
            }
          : {}
      }
    />
  );
}
