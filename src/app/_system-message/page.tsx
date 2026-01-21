/**
 * System Message Page
 *
 * Displays route-specific system messages when a route is intercepted.
 * This page is rendered when the middleware detects a blocking message for a route.
 *
 * @module app/_system-message/page
 */

import { Suspense } from 'react';

import { RouteSpecificMessageSkeleton } from '@/features/system-messages/components/route-specific-message';

import { SystemMessageContent } from './system-message-content';

/**
 * Page props with search params.
 */
interface IPageProps {
  searchParams: Promise<{
    messageId?: string;
    originalPath?: string;
  }>;
}

/**
 * System message page component.
 *
 * Renders the RouteSpecificMessage component with the message data
 * fetched based on the messageId from search params.
 */
export default async function SystemMessagePage({ searchParams }: IPageProps) {
  const params = await searchParams;
  const { messageId, originalPath } = params;

  if (!messageId || !originalPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h1>
          <p className="text-gray-600">Missing required parameters for system message display.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteSpecificMessageSkeleton />}>
      <SystemMessageContent messageId={messageId} originalPath={originalPath} />
    </Suspense>
  );
}

/**
 * Metadata for the system message page.
 */
export const metadata = {
  title: 'System Message - Open Blue Brain Platform',
  description: 'Important system notification',
};
