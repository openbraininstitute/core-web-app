import { atom } from 'jotai';
import { ContentForPricingPlan } from '@/components/LandingPage/content/pricing';

type Subscription = {};

export type SubscriptionFlowState = {
  plan?: ContentForPricingPlan;
  subscription?: Subscription;
};

export const subscriptionFlowState = atom<SubscriptionFlowState | null>({
  plan: undefined,
  subscription: undefined,
});
