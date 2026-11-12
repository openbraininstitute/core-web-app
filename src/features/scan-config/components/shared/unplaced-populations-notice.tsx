/**
 * Over a scene drawn without some of its populations, whose node files could not be read: says
 * which, and reads them again. Under the scene's other chips, which keep the foot and the corners.
 */
export function UnplacedPopulationsNotice({
  names,
  onRetry,
}: {
  names: readonly string[];
  onRetry?: () => void;
}) {
  if (names.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex justify-center px-3">
      <div
        role="alert"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm text-primary-9 shadow-md ring-1 ring-black/5 backdrop-blur"
      >
        <span className="whitespace-nowrap">
          Couldn’t load {names.length === 1 ? names[0] : `${names.length} populations`}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer font-semibold underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
