import FeatureLineSinglePlan from './FeatureLineSinglePlan';

import {
  ContentForPricingFeatureBloc,
  ContentForPricingPlan,
} from '@/components/LandingPage/content/pricing';

import styles from './FeatureBlocSinglePlan.module.css';

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
