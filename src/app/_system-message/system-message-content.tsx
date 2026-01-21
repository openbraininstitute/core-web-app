/**
 * System Message Content Component
 *
 * Client component that fetches and displays the route-specific message.
 *
 * @module app/_system-message/system-message-content
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getMessage } from '@/features/system-messages/api/client';
import {
  RouteSpecificMessage,
  RouteSpecificMessageSkeleton,
} from '@/features/system-messages/components/route-specific-message';

/**
 * Props for the SystemMessageContent component.
 */
interface ISystemMessageContentProps {
  /** The ID of the message to display */
  messageId: string;
  /** The original path that was requested */
  originalPath: string;
}

/**
 * Client component that fetches and displays the route-specific message.
 */
export function SystemMessageContent({ messageId, originalPath }: ISystemMessageContentProps) {
  const {
    data: message,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['system-message', messageId],
    queryFn: () => getMessage(messageId),
    staleTime: 30000, // 30 seconds
    retry: 2,
  });

  if (isLoading) {
    return <RouteSpecificMessageSkeleton />;
  }

  if (error || !message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-4 p-6 bg-white rounded-xl shadow-lg text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Message</h1>
          <p className="text-gray-600 mb-4">
            We couldn&apos;t load the system message. The page you requested may now be available.
          </p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary-8 text-white rounded-lg hover:bg-primary-9 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <RouteSpecificMessage message={message} originalPath={originalPath} />;
}
