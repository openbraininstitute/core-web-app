'use client';

import { useAtom } from 'jotai';

import Plans from '@/components/VirtualLab/create-entity-flows/virtual-lab/subscription-plans';
import PaymentForm from '@/components/VirtualLab/create-entity-flows/virtual-lab/payment-form';

import { ContentForPricingPlan } from '@/components/LandingPage/content/pricing';
import { vlabFlowState } from '@/components/VirtualLab/create-entity-flows/virtual-lab/flow-state';
import {
    type VirtualLabFlowSteps,
} from '@/components/VirtualLab/create-entity-flows/common/types';



type Props = {
    step: VirtualLabFlowSteps;
    onCancel: () => void;
    onStepChange: (step: VirtualLabFlowSteps) => void;
};

export default function Subscription({ step, onCancel, onStepChange }: Props) {
    const [flowState, setFlowState] = useAtom(vlabFlowState);

    const onPreviousPlans = () => onStepChange("plans");
    const onNextPayment = () => {
        if (flowState?.plan?.title === "Free") onStepChange("members");
        if (flowState?.plan?.title === "Pro") onStepChange("payment");
        if (flowState?.plan?.title === "Premium") onStepChange("contact-us");
    }


    const onSelectPlan = (plan: ContentForPricingPlan) => {
        setFlowState(prev => ({
            ...prev,
            plan,
        }));
    }

    return (
        <div className="h-full flex flex-grow flex-col">
            <div className={step !== 'plans' ? 'hidden' : 'relative flex h-full flex-grow flex-col px-4 py-2'}>
                <Plans
                    selectedPlan={flowState?.plan}
                    onSelectPlan={onSelectPlan}
                    onCancel={onCancel}
                    onNextPayment={onNextPayment}
                />
            </div>
            <div className={step !== 'payment' ? 'hidden' : flowState?.plan?.title === "Pro" ? 'relative flex h-full flex-grow flex-col px-4 py-2' : "hidden"}>
                <PaymentForm
                    virtualLabId='081b9eb8-a5e5-44eb-8815-bac492d4ef3c'
                    onCancel={onCancel}
                    onPrevious={onPreviousPlans}
                    onStepChange={onStepChange}
                />
            </div>
        </div>
    )
}
