import { z } from 'zod';

import { isEMailFromForbiddenCountry } from '@/util/email';

/**
 * personNameRegex allows:
 * - Any Unicode letter (\p{L})
 * - Space
 * - Hyphen -
 * - Apostrophe '
 * - Dot .
 *
 * and requires at least one non‑space character
 */
export const personNameRegex = /^[\p{L} .'-]+$/u;
export const personNameRegexMessage =
  "Name contains invalid characters. Use letters, spaces, hyphen (-), apostrophe (') or dot (.) only.";

export const ProfileFormSchema = z.object({
  first_name: z
    .string({ error: 'Please provide a first name!' })
    .trim()
    .min(1, { error: 'Please provide a first name!' })
    .regex(personNameRegex, { message: personNameRegexMessage }),
  last_name: z
    .string({ error: 'Please provide a last name!' })
    .trim()
    .min(1, { error: 'Please provide a last name!' })
    .regex(personNameRegex, { message: personNameRegexMessage }),
  street: z.string().optional(),
  postal_code: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  country: z
    .string({ error: 'Please select a country!' })
    .trim()
    .min(2, { error: 'Please select a country!' })
    .max(2, { error: 'Please select a country!' }),
  email: z.email({ error: 'Please provide a valid email!' }).superRefine((email, ctx) => {
    const forbiddenCountry = isEMailFromForbiddenCountry(email);
    if (forbiddenCountry) {
      ctx.addIssue({
        code: 'custom',
        message: `The platform is not available in ${forbiddenCountry}. Please select a different email.`,
      });
    }
  }),
});
