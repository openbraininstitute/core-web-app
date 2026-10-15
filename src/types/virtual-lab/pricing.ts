export type AdvantagesProps = {
  title: string;
  tooltip: string;
};

export type GeneralFeaturesProps = {
  label: string;
  value: boolean;
};

export type CostSubItemProps = {
  _key: string;
  name: string;
  cost?: string | null;
  available?: boolean | null;
};

export type CostNameProps = {
  _key: string;
  cost?: string | null;
  name: string;
  subItems?: CostSubItemProps[] | null;
};

export type SubscriptionProps = {
  name: string;
  price: number;
  currency: string;
  features?: AdvantagesProps[];
  has_special_label?: boolean;
  special_label?: string;
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
