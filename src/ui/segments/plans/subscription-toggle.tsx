export default function SubscriptionToggle({
  subscription,
  setSubscription,
}: {
  subscription: 'month' | 'year';
  setSubscription: (subscription: 'month' | 'year') => void;
}) {
  return (
    <div className="relative flex flex-row items-center gap-x-2 text-base font-normal">
      <div>Monthly</div>
      <button
        aria-label={`Switch to ${subscription === 'month' ? 'year' : 'month'} subscription`}
        className="border-neutral-3 h-[23px] w-[40px] rounded-full border"
        style={{
          backgroundColor: subscription === 'month' ? '#fff' : '#002766',
        }}
        type="button"
        onClick={() => setSubscription(subscription === 'month' ? 'year' : 'month')}
      >
        <div
          className="h-5 w-5 rounded-full transition-transform duration-300 ease-in-out"
          style={{
            transform: subscription === 'month' ? 'translateX(3px)' : 'translateX(100%)',
            background: subscription === 'month' ? '#002766' : '#fff',
          }}
        />
      </button>

      <div>Yearly</div>
    </div>
  );
}
