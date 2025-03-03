export default function BuyCredits() {
  return (
    <div className="flex transform items-center justify-between rounded-lg bg-primary-8 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <h3 className="text-xl font-bold">Buy credits</h3>
      <button
        aria-label="buy credits"
        type="button"
        className="rounded px-6 py-2 text-lg font-bold text-green-600 transition-colors duration-300"
      >
        Buy
      </button>
    </div>
  );
}
