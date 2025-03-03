import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import { VirtualLab } from "@/api/virtual-lab-svc/queries/types";
import { ContentForPricingPlan } from '@/components/LandingPage/content/pricing';

type Subscription = {}

export type VlabFlowState = {
    information?: VirtualLab;
    plan?: ContentForPricingPlan;
    subscription?: Subscription;
}


export const vlabFlowState = atom<VlabFlowState | null>({
    information: undefined,
    plan: undefined,
    subscription: undefined,
})