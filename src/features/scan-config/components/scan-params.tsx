export function ScanParams({
  scanParams,
  color,
}: {
  scanParams: Record<string, string | number>;
  color: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(scanParams).map(([key, value]) => (
        <div
          key={key}
          className="overflow-x-hidden flex flex-col gap-1.5 items-start justify-start"
        >
          <div title={key} className="truncate text-ellipsis text-gray-400">
            {key.split('.').at(-1)}
          </div>
          <div
            className="truncate font-bold text-ellipsis transition-colors duration-300"
            style={{ color }}
          >
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}
