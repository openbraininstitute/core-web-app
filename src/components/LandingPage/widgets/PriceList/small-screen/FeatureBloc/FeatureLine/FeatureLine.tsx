import React from 'react';

import FeatureCell from './FeatureCell';
import {
  ContentForPricingFeatureItem,
  ContentForPricingPlan,
} from '@/components/LandingPage/content/pricing';
import { classNames } from '@/util/utils';

import styles from './FeatureLine.module.css';

interface FeatureLineProps {
  feature: ContentForPricingFeatureItem;
  plan: ContentForPricingPlan;
  available: boolean;
}

export default function FeatureLine({ feature, plan, available }: FeatureLineProps) {
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
