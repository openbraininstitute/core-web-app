const pricingQuery = `*[_type == "planV2"][] {
  name,
  subtitle,
  custom_plan,
  has_contact_button,
  has_subscription,
  has_subtitle,
  advantages,
  general_features,
  ai_assistant_features,
  build_features,
  notebooks_features,
  simulate_features,
  support,
  monthly_subscriptions[] {
    name,
    price,
    currency,
    has_special_label,
    special_label,
    features
  },
  yearly_subscriptions[] {
    name,
    price,
    currency,
    has_special_label,
    special_label,
    features
  },
  planOrder,
}`;

export default pricingQuery;
