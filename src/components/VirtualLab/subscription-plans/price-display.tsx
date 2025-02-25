interface PriceDisplayProps {
  plan: any;
}
export default function PriceDisplay({ plan }: PriceDisplayProps) {
  if (!plan.price) return null;
  return (
    <div className="space-y-2">
      {plan.originalPrice && (
        <div className="space-y-1">
          <div className="text-gray-500 line-through">
            CHF {plan.originalPrice.monthly.amount} /month
          </div>
          <div className="text-gray-500 line-through">
            CHF {plan.originalPrice.yearly.amount} /year
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold">CHF {plan.price.amount}</span>
          <span className="ml-1 text-gray-600">/{plan.price.interval}</span>
          {plan.isSpecialPrice && (
            <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              Special launch price
            </span>
          )}
        </div>
        {plan.yearlyPrice && (
          <div className="flex items-baseline">
            <span className="text-3xl font-bold">CHF {plan.yearlyPrice.amount}</span>
            <span className="ml-1 text-gray-600">/{plan.yearlyPrice.interval}</span>
            {plan.isSpecialPrice && (
              <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Special launch price
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
