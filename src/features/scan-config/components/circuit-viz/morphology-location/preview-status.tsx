import { LoadingOutlined } from '@ant-design/icons';
import { RiErrorWarningLine } from '@remixicon/react';

/**
 * Whether the open generated block's preview is on its way, or why it could not be made.
 * Nothing once it is drawn: the markers say that themselves.
 */
export function MorphologyLocationPreviewStatus({
  pending,
  error,
}: {
  pending: boolean;
  error?: string;
}) {
  if (!pending && !error) return null;

  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs text-neutral-800 shadow-lg ring-1 ring-black/5 backdrop-blur-md"
    >
      {pending ? (
        <>
          <LoadingOutlined aria-hidden />
          <span>Generating locations…</span>
        </>
      ) : (
        <>
          <RiErrorWarningLine aria-hidden className="size-4 shrink-0 text-red-500" />
          {/* Hoverable, unlike the pill around it: a long reason is only readable in the title. */}
          <span className="pointer-events-auto truncate" title={error}>
            Can't preview these locations: {error}
          </span>
        </>
      )}
    </div>
  );
}
