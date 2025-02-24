import { createHash } from 'crypto';
import { captureException } from '@sentry/nextjs';
import { z } from 'zod';

import { env } from '@/env.mjs';

const API_KEY = env.MAILCHIMP_API_KEY;
const API_SERVER = env.MAILCHIMP_API_SERVER;
const AUDIENCE_ID = env.MAILCHIMP_AUDIENCE_ID;
const url = `https://${API_SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`;

const newsletterFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  name: z
    .string({ message: 'Please enter a name.' })
    .min(2, { message: 'Please a correct name' })
    .optional(),
  tags: z.array(z.string()).optional(),
});

const ErrorMessageMap = {
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
  name?: string;
  tags?: Array<string>;
};

function getErrorMessage(key: ErrorMessageMapType) {
  return ErrorMessageMap[key] || ErrorMessageMap.default;
}

export async function POST(req: Request) {
  let formValidation: RequestBody | null = null;

  try {
    const { email, name, tags } = (await req.json()) as RequestBody;
    formValidation = await newsletterFormSchema.parseAsync({ email, name, tags });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((o) => o.message);
      const reason = error.issues.map((o) => ({ path: o.path, message: o.message }));
      captureException(error, {
        tags: { section: 'landing-page', feature: 'newsletter' },
        extra: {
          issues,
          email: formValidation?.email,
        },
      });
      return Response.json(
        {
          message: 'Oops! There was an error subscribing you to the newsletter',
          reason,
        },
        { status: 422 }
      );
    }

    return Response.json(
      {
        message: 'Oops! There was an error subscribing you to the newsletter',
        reason:
          'message' in (error as { message: string }) ? (error as { message: string }).message : '',
      },
      { status: 500 }
    );
  }

  let tags = ['newsletter', 'website'];

  if (env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'staging') {
    tags.push('test');
  } else {
    tags.push('prod');
  }

  if (formValidation.tags && formValidation.tags.length) {
    tags = [...tags, ...formValidation.tags];
  }

  const data = {
    tags,
    email_address: formValidation.email,
    status: 'subscribed',
    merge_fields: {
      FNAME: formValidation.name,
    },
  };

  const subscriberHash = createHash('md5')
    .update(formValidation.email.trim().toLowerCase())
    .digest('hex');
  const mailchimpUri = `${url}/${subscriberHash}`;

  try {
    const response = await fetch(mailchimpUri, {
      method: 'put',
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
        reason: result.title ?? null,
      },
      { status: result.status ?? 400 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error sending newsletter email', error);
    captureException(error, {
      tags: { section: 'landing-page', feature: 'newsletter' },
      extra: {
        email: formValidation.email,
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
