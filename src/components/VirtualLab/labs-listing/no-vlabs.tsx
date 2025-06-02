'use client';

import { motion } from 'framer-motion';

import { NewWindowAdd, UserCircle } from '@/components/icons/EditorIcons';
import { ActionCard, HeroSection } from '@/components/VirtualLab/labs-listing/elements';
import { TutorialsCarrousel } from '@/components/tutorials-carrousel';

type Props = {
  showCreateSubscription?: boolean;
};

export default function VirtualSplashScreen({ showCreateSubscription = true }: Props) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col py-10">
      <HeroSection />
      <div className="mx-auto mt-6 flex w-full flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <ActionCard
            href="/app/virtual-lab/lab/create"
            title="Create your virtual lab"
            description="In order to start exploring brain regions, building models and simulate neurons, create a virtual lab"
            icon={<NewWindowAdd className="text-4xl" />}
            className="bg-[#2e7432] text-white"
          />
        </motion.div>
        {showCreateSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <ActionCard
              href="/app/virtual-lab/account/subscription"
              title="Get your Pro plan"
              description="In order to push further your models and experiment, choose our Pro plan option"
              icon={<UserCircle className="text-4xl" />}
              className="bg-[#3274d9] text-white"
            />
          </motion.div>
        )}
      </div>
      <TutorialsCarrousel />
    </div>
  );
}
