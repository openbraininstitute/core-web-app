import type { LaunchErrorReason } from '@/features/grading/errors';

export const messages: Record<LaunchErrorReason, { title: string; body: string }> = {
  invalid: {
    title: 'Invalid launch URL',
    body: 'This launch link is not valid. Please re-launch the assignment from Moodle.',
  },
  expired: {
    title: 'Launch link expired',
    body: 'This launch link has expired. Please re-launch the assignment from Moodle.',
  },
  disabled: {
    title: 'Grading launch not configured',
    body: 'The grading integration is not available on this deployment. Please contact your administrator.',
  },
  'notebook-service-failed': {
    title: 'Could not start your notebook',
    body: 'Something went wrong starting your notebook. Please try again, or re-launch the assignment from Moodle.',
  },
  'insufficient-funds': {
    title: 'Not enough credits',
    body: 'Your virtual lab does not have enough credits to launch this assignment. Top up your balance and try again.',
  },
  'accounting-error': {
    title: 'Could not reserve compute',
    body: 'We could not reserve compute resources for your notebook. Please try again in a moment, or contact your administrator if the problem persists.',
  },
  'jupyter-error': {
    title: 'Jupyter could not start',
    body: 'The notebook environment failed to launch in Jupyter. Please try again, or re-launch the assignment from Moodle.',
  },
  'no-project-access': {
    title: 'No access to this course project',
    body: "You don't have access to a project in this virtual lab. Please contact your instructor.",
  },
  'notebook-not-found': {
    title: 'Assignment not found',
    body: "We couldn't find the notebook for this assignment. Please re-launch from Moodle or contact your instructor.",
  },
};
