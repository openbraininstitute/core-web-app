type AdvantagesProps = {
  title: string;
  tooltip: string;
};

type GeneralFeaturesProps = {
  label: string;
  value: boolean;
};

type CostNameProps = {
  cost: string;
  name: string;
};

type SubscriptionProps = {
  name: string;
  price: number;
  currency: string;
};

export type PlanV2 = {
  name: string;
  subtitle: string;
  custom_plan: boolean;
  has_contact_button: boolean;
  has_subscription: boolean;
  monthly_subscriptions: SubscriptionProps[];
  yearly_subscriptions: SubscriptionProps[];
  support: GeneralFeaturesProps[];
  has_subtitle: boolean;
  advantages: AdvantagesProps[];
  general_features: GeneralFeaturesProps[];
  ai_assistant_features: CostNameProps[];
  build_features: CostNameProps[];
  notebooks_features: CostNameProps[];
  simulate_features: CostNameProps[];
  planOrder?: number | null;
};
