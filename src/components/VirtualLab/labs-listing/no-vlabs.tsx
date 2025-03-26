'use client';

import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { NewWindowAdd, UserCircle } from '@/components/icons/EditorIcons';
import { classNames } from '@/util/utils';

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
};

function ActionCard({ href, title, description, icon, className }: ActionCardProps) {
  return (
    <Link href={href}>
      <motion.div
        className={classNames(
          'group relative cursor-pointer overflow-hidden rounded-lg p-8 transition-all duration-300 hover:shadow-xl',
          className
        )}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-primary-8/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="flex items-start justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-semibold text-white">{title}</h2>
            <p className="text-white/80">{description}</p>
          </div>
          <motion.div
            className="text-white/90"
            whileHover={{ rotate: 15 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {icon}
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

function HeroSection() {
  const { data } = useSession();
  const userName = data?.user.name ?? data?.user.username;
  return (
    <motion.div
      className={classNames(
        'relative mx-auto flex w-full flex-col items-start justify-center',
        'z-10 h-80 bg-primary-8 p-6 opacity-100'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        background: `url(/images/brain-skeleton.webp) #003A8C no-repeat  bottom 0 right 0`,
        backgroundSize: 'auto 269px',
      }}
    >
      <motion.h1
        className="text-shadow mb-6 text-4xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7 }}
      >
        Welcome to the Open Brain Platform {userName}
      </motion.h1>
      <motion.p
        className="mb-8 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.7 }}
      >
        Start by creating your first virtual lab in order to create projects, explore, build brain
        models or launch your own experiment
      </motion.p>
    </motion.div>
  );
}

export default function VirtualSplashScreen() {
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
      </div>
    </div>
  );
}
