import React from 'react';

import FeatureCell from './FeatureCell';
import {
  ContentForPricingFeatureItem,
  ContentForPricingPlan,
} from '@/components/LandingPage/content/pricing';
import { classNames } from '@/util/utils';

import styles from './FeatureLine.module.css';

export interface FeatureLineProps {
  feature: ContentForPricingFeatureItem;
  plans: ContentForPricingPlan[];
  available: boolean;
}

export default function FeatureLine({ feature, plans, available }: FeatureLineProps) {
  return (
    <>
      <div className={classNames(!available && styles.unavailable)}>
        <div>{feature.title}</div>
        {feature.description && (
          <em>
            <small>{feature.description}</small>
          </em>
        )}
      </div>
      {plans.map((plan) => (
        <FeatureCell key={plan.id} plan={plan} feature={feature} available={available} />
      ))}
    </>
  );
}
