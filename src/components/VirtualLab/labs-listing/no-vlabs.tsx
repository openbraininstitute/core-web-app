'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { CreditsSolid, StorageOutline, StorageSolid } from '@/components/icons/EditorIcons';

export default function CreateFirstVirtualLab() {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <div className="flex h-full flex-grow flex-col items-center justify-center">
      <main className="flex-1 overflow-auto">
        <div className="flex h-full items-center justify-center p-8">
          <motion.div
            className="glass-card mx-auto mt-8 max-w-3xl"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="p-8">
              <h2 className="mb-4 text-center text-4xl font-bold">Start Your Research Journey</h2>

              <p className="mx-auto mb-8 max-w-xl text-center">
                Create your virtual lab and enjoy a powerful platform designed for collaborative
                research and innovation.
              </p>

              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-md border border-primary-8 bg-white p-6 text-primary-8">
                  <div className="text-primary mb-3">
                    <CreditsSolid className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">100 Free Credits</h3>
                  <p className="text-md text-gray-500">
                    Start with 100 free credits to explore enabled features without limitations.
                  </p>
                </div>

                <div className="rounded-md border border-primary-8 bg-white p-6 text-primary-8">
                  <div className="text-primary mb-3">
                    <StorageSolid className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">1GB Private Storage</h3>
                  <p className="text-md text-gray-500">
                    Store your research data with 1GB of secure cloud storage.
                  </p>
                </div>

                <div className="rounded-md border border-primary-8 bg-white p-6 text-primary-8">
                  <div className="text-primary mb-3">
                    <StorageOutline className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">Free Public Storage</h3>
                  <p className="text-md text-gray-500">Store unlimited public files.</p>
                </div>
              </div>

              <div className="flex justify-center">
                <Link
                  href="/app/virtual-lab/lab/create"
                  className="bg-transparent px-7 py-4 text-lg hover:bg-primary-5"
                >
                  Create Your Virtual Lab
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
