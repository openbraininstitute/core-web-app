import FeatureCell from './FeatureCellSinglePlan/FeatureCellSinglePlan';

import {
  ContentForPricingFeatureItem,
  ContentForPricingPlan,
} from '@/components/LandingPage/content/pricing';
import { classNames } from '@/util/utils';

import styles from './FeatureLineSinglePlan.module.css';

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
