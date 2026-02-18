export default function PlotErrorMessage() {
  return (
    <div className="my-2 inline-flex items-center gap-2 text-sm text-gray-600">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Plot could not be embedded. See below.</span>
    </div>
  );
}
