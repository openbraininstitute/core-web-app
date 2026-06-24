import { classNames } from '@/util/utils';

import FeatureCell from './feature-cell-single-plan/feature-cell-single-plan';

import type {
  ContentForPricingFeatureItem,
  ContentForPricingPlan,
} from '@/services/sanity/api/get-pricing-features';

import styles from './feature-line-single-plan.module.css';

interface FeatureLineSinglePlanProps {
  feature: ContentForPricingFeatureItem;
  plan: ContentForPricingPlan;
  available: boolean;
}

export default function FeatureLineSinglePlan({
  feature,
  plan,
  available,
}: FeatureLineSinglePlanProps) {
  return (
    <div className={styles.featureLine}>
      <div className={classNames(!available && styles.unavailable)}>
        <div>{feature.title}</div>
        {feature.description && (
          <em>
            <small>{feature.description}</small>
          </em>
        )}
      </div>
      <FeatureCell plan={plan} feature={feature} available={available} />
    </div>
  );
}
