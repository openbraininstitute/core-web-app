'use client';

import { useState, useTransition } from 'react';
import { ConfigProvider, Form } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import useNotification from '@/hooks/notifications';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import {
  virtualLabFlowSteps,
  type VirtualLabFlowSteps,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import Subscription from './subscription';
import CreateVirtualLabForm from "@/components/VirtualLab/create-entity-flows/virtual-lab/create-virtual-lab-form";
import AddMembersForm from "@/components/VirtualLab/create-entity-flows/virtual-lab/add-members-form";



type Props = {
  step: VirtualLabFlowSteps;
  onCancel: () => void;
  onStepChange: (step: VirtualLabFlowSteps) => void;
};

export default function CreationForm({ step, onCancel, onStepChange }: Props) {
  const [slideDirection, onChangeDirection] = useState<'right' | 'left'>('right');

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
        </motion.div>
      </AnimatePresence>
    </ConfigProvider >
  );
}
