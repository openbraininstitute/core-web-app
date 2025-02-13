import { captureException } from '@sentry/nextjs';
import { z } from 'zod';
import { env } from '@/env.mjs';

const API_KEY = env.MAILCHIMP_API_KEY;
const API_SERVER = env.MAILCHIMP_API_SERVER;
const AUDIENCE_ID = env.MAILCHIMP_AUDIENCE_ID;

const EmailSchema = z.string().email({ message: 'Please enter a valid email address' });

const ErrorMessageMap = {
  'Member Exists': "Uh oh, it looks like this email's already subscribed 🧐.",
  'Invalid Resource': 'Please provide a valid email address.',
  default: 'Adding new email to newsletter audience failed',
};

type ErrorMessageMapType = keyof typeof ErrorMessageMap;
type MailchimpErrorResponse = {
  type: string;
  title: ErrorMessageMapType;
  status: number;
  detail: string;
  instance: string;
};
type RequestBody = {
  email: string;
};

function getErrorMessage(key: ErrorMessageMapType) {
  return ErrorMessageMap[key] || ErrorMessageMap.default;
}

export async function POST(req: Request) {
  const { email } = (await req.json()) as RequestBody;
  const emailValidation = EmailSchema.safeParse(email);

  if (!emailValidation.success) {
    return new Response('ValidationError: Please enter a valid email address', {
      status: 402,
      statusText: 'Validation error',
    });
  }

  const url = `https://${API_SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`;
  const data = {
    email_address: emailValidation.data,
    status: 'subscribed',
    tags: ['newsletter'],
  };

  try {
    const response = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `api_key ${API_KEY}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      return Response.json(
        {
          message: 'Awesome! You have successfully subscribed!',
        },
        { status: 200 }
      );
    }

    const result = (await response.json()) as MailchimpErrorResponse;

    return Response.json(
      {
        message: getErrorMessage(result.title ?? 'default'),
        reason: result.title ?? 'unknown',
      },
      { status: result.status ?? 400 }
    );
  } catch (error) {
    captureException(error, {
      tags: { section: 'landing-page', feature: 'newsletter' },
      extra: {
        email: emailValidation.data,
      },
    });
    return Response.json(
      {
        message: 'Oops! There was an error subscribing you to the newsletter',
        reason:
          'message' in (error as { message: string }) ? (error as { message: string }).message : '',
      },
      { status: 500 }
    );
  }
}
