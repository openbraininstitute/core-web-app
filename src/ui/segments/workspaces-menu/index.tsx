'use client';

import {
  DownOutlined,
  LoadingOutlined,
  PlusOutlined,
  RightOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useState, useRef, useEffect, ComponentProps, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import compact from 'lodash/compact';
import Link from 'next/link';

import { makeTriggerProfileClickEvent, useProfileClickEvent } from '@/ui/segments/profile/event';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { useVirtualLabClickEvent } from '@/ui/segments/virtual-lab-configuration/event';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { keyBuilder as userKeyBuilder } from '@/ui/queries/user';
import { Item } from '@/ui/segments/workspaces-menu/item';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/queries/workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  className: ComponentProps<'div'>['className'];
};

export function LabDropdown({ className }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const [tryingToExpand, setTryingToExpand] = useState<Set<string>>(new Set([]));
  const [expandedLabs, setExpandedLabs] = useState<Set<string>>(new Set([]));
  const [currentVirtualLabId, setCurrentVirtualLabId] = useState<string | null>(null);
  const [configModalOpen, setOpenConfigModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: user, status: userStatus } = useSession();

  const [
    { data: virtualLabs, isLoading: labsLoading },
    { data: subscription, isLoading: subLoading },
  ] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.listAllLabs(),
        queryFn: async () =>
          await listVirtualLabs({ include: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS] }),
      },
      {
        queryKey: userKeyBuilder.subscription(),
        queryFn: getUserActiveSubscription,
      },
    ],
  });

  const myVirtualLab = useMemo(
    () =>
      virtualLabs?.data?.virtual_lab
        ? { ...virtualLabs?.data?.virtual_lab, isMine: true }
        : undefined,
    [virtualLabs?.data?.virtual_lab]
  );

  const membershipLabs = useMemo(
    () =>
      virtualLabs?.data?.membership_labs
        ? virtualLabs?.data?.membership_labs.results.map((p) => ({
            ...p,
            isMine: false,
          }))
        : [],
    [virtualLabs?.data?.membership_labs]
  );

  const { isLoading: projectsLoading, data: projects } = useQuery({
    queryKey: keyBuilder.listWithinVirtualLab({ virtualLabId: virtualLabId! }),
    queryFn: async () => await listProjects({ virtualLabId: virtualLabId!, page: 1, size: 20 }),
    enabled: !!virtualLabId,
  });

  const labs = useMemo(
    () => compact([myVirtualLab, ...membershipLabs]),
    [myVirtualLab, membershipLabs]
  );

  // Set current virtual lab based on URL
  useEffect(() => {
    if (virtualLabId && labs.length > 0) {
      setCurrentVirtualLabId(virtualLabId);
      setExpandedLabs(new Set([virtualLabId]));
    } else if (!virtualLabId) {
      setCurrentVirtualLabId(null);
      setExpandedLabs(new Set([]));
    }
  }, [virtualLabId, labs.length]);

  const toggleLabExpansion = (labId: string, action?: 'trying' | 'opened') => {
    if (action === 'trying') {
      // add to trying state, do not show children yet
      const newTrying = new Set(tryingToExpand);
      newTrying.add(labId);
      setTryingToExpand(newTrying);
      setCurrentVirtualLabId(labId);
    } else if (action === 'opened') {
      // move from trying to expanded, show children
      const newTrying = new Set(tryingToExpand);
      const newExpanded = new Set(expandedLabs);

      newTrying.delete(labId);
      newExpanded.add(labId);

      setTryingToExpand(newTrying);
      setExpandedLabs(newExpanded);
    } else {
      // toggle behavior for closing
      const newExpanded = new Set(expandedLabs);
      const newTrying = new Set(tryingToExpand);

      if (expandedLabs.has(labId)) {
        newExpanded.delete(labId);
        setCurrentVirtualLabId(null);
      } else if (tryingToExpand.has(labId)) {
        newTrying.delete(labId);
        setCurrentVirtualLabId(null);
      }

      setExpandedLabs(newExpanded);
      setTryingToExpand(newTrying);
    }
  };

  const currentVirtualLabName = labs.find((lab) => lab.id === virtualLabId)?.isMine
    ? 'My virtual lab'
    : labs.find((lab) => lab.id === virtualLabId)?.name || 'Virtual lab';

  const currentProjectName = projectId
    ? projects?.data?.results.find((o) => o.id === projectId)?.name
    : 'Select project';

  useVirtualLabClickEvent((event) => {
    setOpenConfigModal(event.detail.on);
  });

  useProfileClickEvent((event) => {
    setOpenConfigModal(event.detail.on);
  });

  return (
    <div className={cn('relative', className)} ref={dropdownRef} id="virtual-lab-menu">
      <button
        id="virtual-lab-menu-button"
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cn(
          'relative flex h-10 w-full items-center justify-between px-4 py-2 text-sm transition-all duration-150 ease-out',
          'hover:bg-gray-50',
          {
            'border-neutral-2 h-14 rounded-md rounded-b-none border border-b-0 bg-white shadow-xl':
              isExpanded,
          },
          { 'border-neutral-2 rounded-full border text-gray-700 hover:bg-gray-50': !isExpanded },
          { 'h-12': breakpoint === 'xl' },
          { 'z-[1001]': configModalOpen }
        )}
        aria-label={`${currentVirtualLabName}/${currentProjectName}`}
        title={`${currentVirtualLabName}/${currentProjectName}`}
        role="menubar"
        disabled={labsLoading || projectsLoading}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* Collapsed State - Breadcrumb */
            <motion.div
              key="breadcrumb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex w-full flex-1 items-center space-x-2 overflow-hidden rounded-full"
            >
              {virtualLabId && (
                <>
                  <span className="w-fit min-w-fit text-gray-500">{currentVirtualLabName}</span>
                  <RightOutlined className="text-gray-400" />
                  <span className="text-primary-9 min-w-0 flex-1 truncate text-left font-bold">
                    {currentProjectName}
                  </span>
                </>
              )}
              {!virtualLabId && <span className="text-gray-500">Select virtual lab</span>}
            </motion.div>
          ) : (
            userStatus === 'authenticated' && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className={cn('hover:text-neutral-4 flex w-full items-center justify-between')}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col flex-wrap items-start">
                    <span className="text-xs">you are connected as:</span>
                    <h3 className="text-left text-sm font-bold text-gray-800">
                      {user?.user.name ?? user?.user.username}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/app/log-out" className="hover:underline">
                    Logout
                  </Link>
                  <div
                    className="text-neutral-4 hover:text-neutral-3 group cursor-pointer gap-1 p-0 pr-0 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      makeTriggerProfileClickEvent({ on: true });
                    }}
                  >
                    <div className="group-hover:bg-primary-7 flex items-center justify-center rounded-full bg-gray-800 p-1 text-white group-hover:text-white">
                      <UserOutlined className="text:md text-current xl:text-lg" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="ml-2"
        >
          {projectsLoading ? (
            <LoadingOutlined spin />
          ) : (
            <DownOutlined
              className="text-gray-400"
              onClick={(e) => {
                e.stopPropagation();
                if (configModalOpen) return;
                setIsExpanded((prev) => !prev);
              }}
            />
          )}
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="virtual-lab-menu-content"
            initial={{ opacity: 0, scaleY: 0.95, transformOrigin: 'top' }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'border-neutral-2 absolute top-full left-0 z-50 w-full overflow-hidden rounded-tr-lg rounded-b-lg border border-t-0 bg-white shadow-lg',
              'relative flex flex-col',
              'h-full max-h-[calc(100vh-5rem)] min-h-[calc(100vh-5rem)]',
              { 'rounded-t-none': isExpanded },
              { 'z-[1001]': configModalOpen }
            )}
            // style={{ maxHeight: '80vh' }}
          >
            {subscription?.subscription.tier === 'FREE' && (
              <button
                type="button"
                aria-label="get pro subscription"
                className="m-2 rounded-md bg-gradient-to-r from-[#003A8C] to-[#2D5A99]"
              >
                <div className="flex flex-col items-start px-4 py-2 text-left text-white">
                  <h2 className="mb-1.5 text-lg font-bold">Get your Pro plan</h2>
                  <p className="text-base font-light">
                    Discover more features, build models, launch experiments...
                  </p>
                </div>
              </button>
            )}
            {/* Labs List */}
            <div className="secondary-scrollbar max-h-[calc(100vh-7rem)] overflow-y-auto rounded-md">
              {labs.map((lab, index) => (
                <motion.div
                  key={lab.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02, duration: 0.1 }}
                  className={cn('flex flex-col border-b border-gray-100 last:border-b-0', {
                    'rounded-t-none': isExpanded,
                  })}
                >
                  <Item
                    key={lab.id}
                    lab={lab}
                    activeProjectId={projectId}
                    isOpen={currentVirtualLabId === lab.id}
                    expandedLabs={expandedLabs}
                    tryingToExpand={tryingToExpand}
                    toggleLabExpansion={toggleLabExpansion}
                  />
                </motion.div>
              ))}
            </div>

            {/* Add Project Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.1 }}
              className="mt-auto border-t border-gray-100 p-4"
            >
              <Button rounded size="md" variant="default" className="w-full">
                Add project
                <PlusOutlined className="ml-auto text-sm" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LabDropdown;
