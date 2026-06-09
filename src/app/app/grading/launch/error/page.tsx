import type { ServerSideComponentProp } from '@/types/common';

export const LAUNCH_ERROR_REASONS = [
  'invalid',
  'expired',
  'disabled',
  'notebook-service-failed',
  'insufficient-funds',
  'accounting-error',
  'jupyter-error',
  'no-project-access',
  'template-not-initialized',
  'notebook-not-found',
] as const;

export type LaunchErrorReason = (typeof LAUNCH_ERROR_REASONS)[number];

const COPY: Record<LaunchErrorReason, { title: string; body: string }> = {
  invalid: {
    title: 'Invalid launch URL',
    body: 'This launch link is not valid. Please re-launch the exercise from Moodle.',
  },
  expired: {
    title: 'Launch link expired',
    body: 'This launch link has expired. Please re-launch the exercise from Moodle.',
  },
  disabled: {
    title: 'Grading launch not configured',
    body: 'The grading integration is not available on this deployment. Please contact your administrator.',
  },
  'notebook-service-failed': {
    title: 'Could not start your notebook',
    body: 'Something went wrong starting your notebook. Please try again, or re-launch the exercise from Moodle.',
  },
  'insufficient-funds': {
    title: 'Not enough credits',
    body: 'Your virtual lab does not have enough credits to launch this exercise. Top up your balance and try again.',
  },
  'accounting-error': {
    title: 'Could not reserve compute',
    body: 'We could not reserve compute resources for your notebook. Please try again in a moment, or contact your administrator if the problem persists.',
  },
  'jupyter-error': {
    title: 'Jupyter could not start',
    body: 'The notebook environment failed to launch in Jupyter. Please try again, or re-launch the exercise from Moodle.',
  },
  'no-project-access': {
    title: 'No access to this course project',
    body: "You don't have admin access to a project in this virtual lab. Please contact your instructor.",
  },
  'template-not-initialized': {
    title: 'Course not initialized',
    body: "This course's template project hasn't been set up yet. Please contact the course administrator.",
  },
  'notebook-not-found': {
    title: 'Exercise not found',
    body: "We couldn't find the notebook for this exercise. Please re-launch from Moodle or contact your instructor.",
  },
};

function isLaunchErrorReason(value: string | undefined): value is LaunchErrorReason {
  return typeof value === 'string' && (LAUNCH_ERROR_REASONS as readonly string[]).includes(value);
}

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, { reason?: string }>) {
  const { reason } = await searchParams;
  const key = isLaunchErrorReason(reason) ? reason : 'invalid';
  const { title, body } = COPY[key];

  return (
    <div className="flex max-w-md flex-col items-center justify-center space-y-4 px-6 text-center">
      <h2 className="text-primary-8 text-xl font-bold">{title}</h2>
      <p className="text-primary-7">{body}</p>
    </div>
  );
}
