import FeatureLineSinglePlan from './feature-line-single-plan';

import type {
  ContentForPricingFeatureBloc,
  ContentForPricingPlan,
} from '@/services/sanity/api/get-pricing-features';

import styles from './feature-bloc-single-plan.module.css';

interface FeatureBlocSinglePlanProps {
  bloc: ContentForPricingFeatureBloc;
  plan: ContentForPricingPlan;
}

export default function FeatureBlocSinglePlan({ bloc, plan }: FeatureBlocSinglePlanProps) {
  return (
    <div className={styles.featureBloc}>
      <div className={styles.title}>
        {bloc.title}
        {!bloc.available && <span className={styles.capsule}>Future release</span>}
      </div>
      {bloc.features.map((feature) => (
        <FeatureLineSinglePlan
          key={feature.title}
          feature={feature}
          plan={plan}
          available={bloc.available}
        />
      ))}
    </div>
  );
}
