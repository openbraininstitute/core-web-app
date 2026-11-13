'use client';

import { RiCheckFill, RiFileCopyLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { UserFilled } from '@/components/icons/buttons';
import { SignOutFill } from '@/components/icons/EditorIcons';
import { config } from '@/config';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { ExperimentalFeatures } from '@/ui/segments/profile/sections/experimental-features';
import { Invoices } from '@/ui/segments/profile/sections/invoices';
import { UserProfile } from '@/ui/segments/profile/sections/profile';
import { Subscription } from '@/ui/segments/profile/sections/subscription';
import { keyBuilder as userKeyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';

const showExperimentalFeatures = config.DEPLOYMENT_ENV !== 'production';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'invoices', label: 'Invoices' },
  ...(showExperimentalFeatures ? [{ key: 'flags', label: 'Feature flags' }] : []),
] as const;
type TTab = (typeof TABS)[number]['key'];

/**
 * The user's own page, opened from their icon in the toolbar: everything the profile panel of the lab and project
 * switcher held (profile, subscription, invoices, feature flags, the access token and logging out), on a page of
 * its own rather than in the dropdown.
 */
export function ProfilePage() {
  const [tab, setTab] = useState<TTab>('profile');
  const { data: session } = useSession();
  const [, copy, , copying] = useCopyToClipboard();
  const { data: user } = useQuery({
    queryKey: userKeyBuilder.profile(),
    queryFn: getUserProfile,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const name = user?.profile.first_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : (user?.profile.preferred_username ?? user?.profile.email ?? 'Your profile');

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <header className="border-neutral-2 flex shrink-0 items-center justify-between gap-6 border-b px-8 pt-6 pb-0">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="bg-primary-0 text-primary-9 flex size-14 shrink-0 items-center justify-center rounded-full text-2xl">
              <UserFilled />
            </span>
            <div className="flex min-w-0 flex-col">
              <h1 className="text-primary-9 truncate text-2xl font-bold">{name}</h1>
              {user?.profile.email && <span className="text-neutral-5 text-sm">{user.profile.email}</span>}
            </div>
          </div>
          {/* the sections as tabs, the one open with its bar on the page's line, as the toolbar's are */}
          <nav className="-mb-px flex gap-1" aria-label="Profile sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'border-b-[3px] px-4 pt-1 pb-3 text-[15px] transition-colors',
                  tab === t.key
                    ? 'border-primary-9 text-primary-9 font-semibold'
                    : 'hover:text-primary-9 border-transparent text-neutral-600'
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => session?.accessToken && void copy(session.accessToken)}
            className="text-primary-9 border-neutral-2 hover:bg-neutral-1 flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
          >
            {copying ? <RiCheckFill className="size-4 text-emerald-600" /> : <RiFileCopyLine className="size-4" />}
            Copy token
          </button>
          <Link
            href="/app/log-out"
            prefetch={false}
            className="bg-primary-9 hover:bg-primary-8 flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white"
          >
            <SignOutFill className="size-3.5" />
            Log out
          </Link>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex h-full max-w-5xl flex-col">
          {tab === 'profile' && <UserProfile />}
          {tab === 'subscription' && <Subscription onExpandedChange={() => {}} />}
          {tab === 'invoices' && <Invoices />}
          {tab === 'flags' && <ExperimentalFeatures />}
        </div>
      </div>
    </div>
  );
}
