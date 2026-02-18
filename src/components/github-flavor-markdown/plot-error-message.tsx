export default function PlotErrorMessage() {
  return (
    <div className="my-4">
      <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm font-medium text-yellow-800">
          Error loading plot. Plots can be seen below.
        </p>
      </div>
    </div>
  );
}
