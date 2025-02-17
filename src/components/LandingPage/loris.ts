export interface Pricing {
  features: PricingFeaturesBloc[];
  plans: PricingPlan[];
}

// ==============================================

interface PricingFeaturesBloc {
  title: string;
  features: PricingFeaturesItem;
  futureRelease: boolean;
}

interface PricingFeaturesItem {
  title: string;
  description?: string;
  plans: PricingFeaturesPlan[];
}

type PricingPlanId = 'basic' | 'plus' | 'pro' | 'premium';

interface PricingFeaturesPlan {
  id: PricingPlanId;
  specialLabel?: string;
  specialDescription?: string;
}

// ==============================================

interface PricingPlan {
  id: PricingPlanId;
  title: string;
  // Plein d'autres trucs à définir
}
