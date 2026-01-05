export default function SubscriptionToggle({
    billingInterval,
  setBillingInterval,
}: {
  billingInterval: 'month' | 'year';
  setBillingInterval: (billingInterval: 'month' | 'year') => void;
}) {
  return (
    <div className="relative flex flex-row items-center gap-x-2 text-base font-normal">
      <div>Monthly</div>
      <button
        aria-label={`Switch to ${billingInterval === 'month' ? 'year' : 'month'} subscription`}
        className="border-neutral-3 h-[23px] w-[40px] rounded-full border"
        style={{
          backgroundColor: billingInterval === 'month' ? '#fff' : '#002766',
        }}
        type="button"
        onClick={() => setBillingInterval(billingInterval === 'month' ? 'year' : 'month')}
      >
        <div
          className="h-5 w-5 rounded-full transition-transform duration-300 ease-in-out"
          style={{
            transform: billingInterval === 'month' ? 'translateX(3px)' : 'translateX(100%)',
            background: billingInterval === 'month' ? '#002766' : '#fff',
          }}
        />
      </button>

      <div>Yearly</div>
    </div>
  );
}
