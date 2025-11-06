'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import ChevronDownIcon from '@/components/icons/ChevronDownIcon';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type FeedbackFormProps = {
  onClose: () => void;
};

export default function FeedbackForm({ onClose }: FeedbackFormProps) {
  const [type, setType] = useState('');
  const [section, setSection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { virtualLabId, projectId } = useWorkspace();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: projectData } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
    enabled: Boolean(virtualLabId && projectId),
  });

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: Boolean(virtualLabId),
  });

  const projectName = projectData?.data?.project?.name ?? '';
  const virtualLabName = virtualLabData?.data?.virtual_lab?.name ?? '';

  const getMonthYearLabel = () => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = now.getFullYear();
    return `${month}-${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Get current page URL
    const currentUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
        : '';

    // Use first 60 characters of feedback as title
    const title = feedback.substring(0, 60).trim() || `[${type.toUpperCase()}] in ${section}`;

    // Build body with project, virtual lab info, and current URL
    const body = `**Feedback Type:** ${type}\n**Section:** ${section}\n\n${feedback}\n\n---\n\nProject: ${projectName}\n\nVirtual Lab: ${virtualLabName}\n\nURL: ${currentUrl}`;

    try {
      const res = await fetch('/api/feedback/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          label: getMonthYearLabel(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create ticket');

      const data = await res.json();
      setMessage(`Ticket created: ${data.issueUrl}`);
      // Reset form
      setType('');
      setSection('');
      setFeedback('');
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);
    } catch (error) {
      setMessage('Error creating ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="border-neutral-2 mb-6 flex items-start justify-between border-b pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-primary-9 text-2xl font-bold">Submit Feedback</h2>
          <p className="text-neutral-4 text-sm">
            Help us improve by sharing your thoughts, reporting bugs, or suggesting new features.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="hover:bg-neutral-1 h-8 w-8 p-0"
        >
          <CloseOutlined className="text-lg" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <label htmlFor="type" className="flex flex-col gap-2">
            <span className="text-primary-9 text-base font-normal">Feedback Type</span>
            <div className="relative">
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className={cn(
                  'border-neutral-2 w-full rounded-lg border text-sm',
                  'focus:border-primary-4 focus:ring-primary-4/20 rounded-full bg-white focus:ring-2 focus:outline-none',
                  'appearance-none py-3 pr-12 pl-6',
                  !type && 'text-neutral-5 text-base font-normal'
                )}
              >
                <option value="" disabled className="text-neutral-5 text-base font-normal">
                  Select your feedback type...
                </option>
                <option value="enhancement">Enhancement</option>
                <option value="bugs">Bugs</option>
                <option value="new feature">New Feature</option>
                <option value="payment">Payment</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" />
            </div>
          </label>

          <label htmlFor="section" className="flex flex-col gap-2">
            <span className="text-primary-9 text-base font-normal">Section</span>
            <div className="relative">
              <select
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
                className={cn(
                  'border-neutral-2 w-full rounded-lg border text-sm',
                  'focus:border-primary-4 focus:ring-primary-4/20 rounded-full bg-white focus:ring-2 focus:outline-none',
                  'appearance-none py-3 pr-12 pl-6',
                  !section && 'text-neutral-5 text-base font-normal'
                )}
              >
                <option value="" disabled className="text-neutral-5 text-base font-normal">
                  Select a section...
                </option>
                <option value="data explore">Data Explore</option>
                <option value="project">Project</option>
                <option value="virtual lab">Virtual Lab</option>
                <option value="workflow">Workflow</option>
                <option value="notebooks">Notebooks</option>
                <option value="help">Help</option>
                <option value="reports">Reports</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" />
            </div>
          </label>
        </div>

        {/* Your feedback */}
        <label htmlFor="feedback" className="flex flex-col gap-2">
          <span className="text-primary-9 text-base font-normal">Your feedback</span>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Enter your feedback here..."
            required
            rows={6}
            className={cn(
              'border-neutral-2 rounded-lg border px-3 py-2 text-sm',
              'focus:border-primary-4 focus:ring-primary-4/20 focus:ring-2 focus:outline-none',
              'resize-none',
              'placeholder:text-neutral-5 placeholder:text-base placeholder:font-normal'
            )}
          />
        </label>

        {message && (
          <div
            className={cn(
              'rounded-lg px-4 py-2 text-sm',
              message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            )}
          >
            {message}
          </div>
        )}

        {/* Footer buttons */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-primary-9 border-none text-lg font-normal"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={loading || !feedback.trim()}
            className="bg-primary-9 rounded-full px-20 py-8 text-xl font-semibold text-white"
          >
            {loading ? 'Sending...' : 'Send Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
}
