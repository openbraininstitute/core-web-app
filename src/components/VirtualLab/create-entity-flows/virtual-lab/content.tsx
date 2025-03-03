'use client';

import { useEffect, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useResetAtom } from 'jotai/utils';
import { ConfigProvider } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

import CreateVirtualLabForm from "@/components/VirtualLab/create-entity-flows/virtual-lab/create-virtual-lab-form";
import Subscription from '@/components/VirtualLab/create-entity-flows/virtual-lab/subscription';
import ContactUs from '@/components/VirtualLab/create-entity-flows/virtual-lab/contact-us-form';
import AddMembersForm from "@/components/VirtualLab/create-entity-flows/virtual-lab/add-members-form";

import { virtualLabFlowAtom } from '@/components/VirtualLab/create-entity-flows/virtual-lab/step-menu';
import { vlabFlowState } from '@/components/VirtualLab/create-entity-flows/virtual-lab/flow-state';
import { type VirtualLabFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';

export default function Content() {
  const { push: navigate } = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [step, setCurrentStep] = useAtom(virtualLabFlowAtom);

  console.log("ᦨ #  content.tsx:25 #  Content #  step:", step);

  const resetFlow = useResetAtom(virtualLabFlowAtom);
  const resetFlowState = useSetAtom(vlabFlowState);
  const state = useAtomValue(vlabFlowState);

  console.log("ᦨ #  content.tsx:28 #  Content #  state:", state);


  const [slideDirection, onChangeDirection] = useState<'right' | 'left'>('right');
  const onStepChange = (t: VirtualLabFlowSteps) => setCurrentStep(t);
  const onCancel = () => {
    resetFlowState(null);
    navigate('/app/virtual-lab');
  }

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    return () => {
      resetFlow();
      resetFlowState(null);
    }
  }, [resetFlow, resetFlowState]);

  if (!hydrated) return null;
  return (
    <ConfigProvider theme={{ hashed: false }}>
      <AnimatePresence initial={false} custom={slideDirection} mode="wait">
        <motion.div
          key={step}
          custom={slideDirection}
          variants={{
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: 0.3,
            type: 'tween',
            ease: 'easeInOut',
          }}
          className="relative flex h-full flex-grow flex-col"
        >
          <div className={(step !== 'information') ? 'hidden' : 'flex h-full flex-grow flex-col'}>
            <CreateVirtualLabForm {...{ step, onCancel, onStepChange, onChangeDirection }} />
          </div>
          <div className={step !== 'payment' && step !== "plans" ? 'hidden' : 'flex h-full flex-grow flex-col'}>
            <Subscription {...{ step, onCancel, onStepChange }} />
          </div>
          <div className={step !== 'members' ? 'hidden' : 'flex h-full flex-grow flex-col'}>
            <AddMembersForm {...{ step, onCancel, onStepChange }} />
          </div>
          <div className={step !== 'contact-us' ? 'hidden' : 'flex h-full flex-grow flex-col'}>
            <ContactUs {...{ step, onCancel, onStepChange }} />
          </div>
        </motion.div>
      </AnimatePresence>
    </ConfigProvider >
  );
}
