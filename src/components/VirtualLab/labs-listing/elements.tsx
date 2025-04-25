'use client';

import Link from 'next/link';
import { Empty } from 'antd';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { ExclamationCircleFilled } from '@ant-design/icons';

import { classNames } from '@/util/utils';

export function ErrorListing() {
  return (
    <div
      data-testid="virtual-labs-error"
      className="mb-6 transform rounded-sm bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl"
    >
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-red-200">Unable to load virtual labs</h2>
          <p className="max-w-xl text-red-200/80">
            Please try refreshing the page or return later. If the issue persists, please contact
            support at{' '}
            <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <ExclamationCircleFilled className="text-2xl text-yellow-400" />
          <span className="text-xl font-bold text-yellow-400">Error</span>
        </div>
      </div>
    </div>
  );
}

export function MembershipVirtualLabsEmpty() {
  return (
    <div
      data-testid="virtual-labs-memberships-empty"
      className="mx-auto mb-6 w-full max-w-7xl rounded-sm border border-white bg-primary-9 p-6 hover:shadow-sm"
    >
      <div className="flex flex-col items-start justify-between gap-1">
        <h2 className="text-2xl font-bold text-white">
          <ExclamationCircleFilled className="mr-2 text-white" />
          You are not a member of any virtual lab yet
        </h2>
        <p className="ml-8 max-w-xl text-white">
          This platform is for collaboration and knowledge sharing, you can invite others to your
          virtual lab or get invited to join theirs.
        </p>
      </div>
    </div>
  );
}

export function EmptySearchMembershipVirtualLabs({ searchValue }: { searchValue: string }) {
  return (
    <div
      data-testid="virtual-labs-memberships-empty"
      className="mb-6 rounded-sm bg-primary-9 p-6 py-20 hover:shadow-sm"
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={null} className="m-0" />
        <h2 className="text-xl font-light text-white">
          We couldn&lsquo;t find any virtual labs with names that match{' '}
          <span className="font-bold">&apos;{searchValue}&apos;</span>
        </h2>
      </div>
    </div>
  );
}

export function GetProPlanCard() {
  return (
    <Link
      href="/app/virtual-lab/account/subscription"
      className={classNames(
        'relative',
        'mx-auto h-32 w-full rounded-lg p-6',
        'z-0 bg-[rgb(39,111,201)]',
        'bg-gradient-to-r from-[rgba(39,111,201,1)] to-[rgba(0,34,77,1)]'
      )}
    >
      <div
        style={{
          background: "url('/images/get-pro-bg.webp') no-repeat center right",
          backgroundSize: '50%',
          backgroundPosition: 'right',
        }}
      />
      <h2 className="z-10 text-2xl font-semibold">Get your Pro plan</h2>
      <p className="z-10 text-gray-200">
        In order to join other labs or invite teammates in your lab...
      </p>
    </Link>
  );
}

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
};

export function ActionCard({ href, title, description, icon, className }: ActionCardProps) {
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

export function HeroSection() {
  const { data } = useSession();
  const userName = data?.user.name ?? data?.user.username;
  return (
    <motion.div
      className={classNames(
        'relative mx-auto flex w-full flex-col items-start justify-center',
        'z-10 bg-primary-8 px-6 py-10 opacity-100'
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
