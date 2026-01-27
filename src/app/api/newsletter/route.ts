import { createHash } from 'node:crypto';
import { captureException } from '@sentry/nextjs';
import { z } from 'zod';

import { serverConfig as config } from '@/config/server';

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
  const url = `https://${config.MAILCHIMP_API_SERVER}.api.mailchimp.com/3.0/lists/${config.MAILCHIMP_AUDIENCE_ID}/members`;

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

  let tags = ['website'];

  if (config.DEPLOYMENT_ENV === 'production') {
    tags.push('prod');
  } else {
    tags.push('test');
  }

  if (formValidation.tags?.length) {
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
        Authorization: `api_key ${config.MAILCHIMP_API_KEY}`,
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
