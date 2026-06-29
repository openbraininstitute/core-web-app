'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { authFetch } from '@/auth-fetch';
import { ErrorComponent } from '@/components/GenericErrorFallback';
import { useConfig } from '@/config';
import { Button } from '@/ui/molecules/button';

interface ClaimError {
  message: string;
  display: string;
}

interface ClaimSuccessData {
  virtual_lab_id: string;
  project_id: string;
  course_name?: string;
  start_date?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  'Enrolment not found': 'The enrolment could not be found. Please check your link.',
  'This enrolment has been dropped': 'This enrolment has been dropped and cannot be claimed.',
  'This enrolment has already been claimed':
    'This enrolment has already been claimed by another user.',
  'Cannot claim enrolment: course is in':
    'The course is no longer active and cannot accept new claims.',
  'Cannot claim enrolment: course has ended':
    'The course has ended and enrolments can no longer be claimed.',
};

export default function CourseEnrolmentPage() {
  const config = useConfig();
  const searchParams = useSearchParams();
  const enrolmentId = searchParams.get('enrolment_id');
  const [error, setError] = useState<ClaimError | null>(null);
  const [success, setSuccess] = useState<ClaimSuccessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const claim = async () => {
      if (!enrolmentId) {
        setError({
          message: 'Missing enrolment ID',
          display: 'Invalid link. Please check your enrolment link.',
        });
        setLoading(false);
        return;
      }

      try {
        const response = await authFetch(`${config.VIRTUAL_LAB_API_URL}/courses/claim`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ enrolment_id: enrolmentId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.message || 'Failed to claim enrolment';

          let displayMsg = errorMsg;
          for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
            if (errorMsg.includes(key)) {
              displayMsg = value;
              break;
            }
          }

          setError({ message: errorMsg, display: displayMsg });
          setLoading(false);
          return;
        }

        const responseData = await response.json();
        const data = responseData.data;

        // Check if course has started
        const courseStartDate = data.course?.start_date ? new Date(data.course.start_date) : null;
        const now = new Date();
        const courseHasStarted = courseStartDate && now >= courseStartDate;

        if (courseHasStarted && data.project_id) {
          // Course already started - activate then redirect to project
          try {
            await authFetch(`${config.VIRTUAL_LAB_API_URL}/courses/activate-enrolments`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
              },
            });
          } catch (error) {
            console.error('Failed to activate enrolments', error);
          }
          window.location.href = `/app/virtual-lab/${data.virtual_lab_id}/${data.project_id}`;
        } else {
          // Course hasn't started yet - show success message
          setSuccess({
            virtual_lab_id: data.virtual_lab_id,
            project_id: data.project_id,
            course_name: data.course?.virtual_lab_name || 'Course',
            start_date: data.course?.start_date,
          });
          setLoading(false);
        }
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'Unknown error',
          display: 'An unexpected error occurred. Please try again.',
        });
        setLoading(false);
      }
    };

    claim();
  }, [enrolmentId, config.VIRTUAL_LAB_API_URL]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-primary-9">Claiming enrolment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="mx-auto w-full max-w-md text-center">
          <ErrorComponent
            error={new Error(error.display)}
            customError={error.display}
            showButtons={false}
          />
          <div className="mt-6">
            <Button
              onClick={() => {
                window.location.href = '/app/virtual-lab/sync';
              }}
            >
              Go to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Enrolment confirmed</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-primary-9">Enrolment confirmed!</h2>
          <p className="mb-6 text-gray-600">
            You've been enrolled to <span className="font-semibold">{success.course_name}</span>
          </p>
          {success.start_date && (
            <p className="mb-6 text-sm text-gray-500">
              Course starts on{' '}
              <span className="font-semibold">
                {new Date(success.start_date).toLocaleDateString()}
              </span>
            </p>
          )}
          <Button
            onClick={() => {
              window.location.href = '/app/virtual-lab/sync';
            }}
          >
            Go to home
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
