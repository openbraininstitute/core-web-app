import { PricePerPlanProps, PRICES_PER_PLAN } from './content/PRICES_PER_PLAN';
import SinglePriceColumn from './single-price-column/SinglePriceColumn';

export default function PricesList() {
  return (
    <>
      {PRICES_PER_PLAN.map((plan: PricePerPlanProps) => (
        <SinglePriceColumn content={plan} key={plan.plan} />
      ))}
    </>
  );
}
