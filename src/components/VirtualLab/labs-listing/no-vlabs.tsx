"use client";

import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

import { NewWindowAdd, UserCircle } from '@/components/icons/EditorIcons';
import { classNames } from '@/util/utils';

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function ActionCard({ href, title, description, icon, className, onClick }: ActionCardProps) {
  return (
    <Link href={href}>
      <motion.div
        className={classNames(
          "rounded-lg p-8 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden group",
          className
        )}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-primary-8/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold mb-1 text-white">{title}</h2>
            <p className="text-white/80">{description}</p>
          </div>
          <motion.div
            className="text-white/90"
            whileHover={{ rotate: 15 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {icon}
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
};

function HeroSection() {
  const { data } = useSession();
  const userName = data?.user.name ?? data?.user.username;
  return (
    <motion.div
      className={classNames(
        "w-full max-w-7xl  flex flex-col justify-center items-start mx-auto relative",
        "z-10 opacity-100 bg-primary-8 p-6 h-72"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        background: `url(/images/brain-skeleton.webp) #003A8C no-repeat bottom -67px right -100px`,
        backgroundSize: '710px 300px',
        transform: "rotate(90deg)",
      }}
    >
      <motion.h1
        className="text-4xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-6 text-shadow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7 }}
      >
        Welcome to OBI {userName}
      </motion.h1>
      <motion.p
        className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.7 }}
      >
        Start by creating your first virtual lab in order to create projects,
        explore, build brain models or launch your own experiment
      </motion.p>
    </motion.div>
  )
}

export default function VirtualSplashScreen() {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-10 flex flex-col min-h-screen">
      <HeroSection />
      <div className="mt-6 w-full flex flex-col gap-6 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <ActionCard
            href='/app/virtual-lab/lab/create'
            title="Create your virtual lab"
            description="In order to start exploring brain regions, building models and simulate neurons, create a virtual lab"
            icon={<NewWindowAdd className='text-4xl' />}
            className="bg-[#2e7432] text-white"
            onClick={() => console.log("Create virtual lab clicked")}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <ActionCard
            href='/'
            title="Get your Pro plan"
            description="In order to push further your models and experiment, choose our Pro plan option"
            icon={<UserCircle className='text-4xl' />}
            className="bg-[#3274d9] text-white"
            onClick={() => console.log("Get Pro plan clicked")}
          />
        </motion.div>
      </div>
    </div>
  )
}
