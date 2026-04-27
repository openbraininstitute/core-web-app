export default function SubscriptionToggle({
  billingInterval,
  setBillingInterval,
  dark,
}: {
  billingInterval: 'month' | 'year';
  setBillingInterval: (billingInterval: 'month' | 'year') => void;
  dark?: boolean;
}) {
  const offBg = dark ? '#1d4ed8' : '#fff';
  const onBg = dark ? '#fff' : '#002766';
  const offThumb = dark ? '#fff' : '#002766';
  const onThumb = dark ? '#002766' : '#fff';

  return (
    <div className="relative flex flex-row items-center gap-x-2 text-base font-normal">
      <div>Monthly</div>
      <button
        aria-label={`Switch to ${billingInterval === 'month' ? 'year' : 'month'} subscription`}
        className="border-neutral-3 h-[23px] w-[40px] rounded-full border"
        style={{
          backgroundColor: billingInterval === 'month' ? offBg : onBg,
        }}
        type="button"
        onClick={() => setBillingInterval(billingInterval === 'month' ? 'year' : 'month')}
      >
        <div
          className="h-5 w-5 rounded-full transition-transform duration-300 ease-in-out"
          style={{
            transform: billingInterval === 'month' ? 'translateX(3px)' : 'translateX(100%)',
            background: billingInterval === 'month' ? offThumb : onThumb,
          }}
        />
      </button>

      <div>Yearly</div>
    </div>
  );
}
