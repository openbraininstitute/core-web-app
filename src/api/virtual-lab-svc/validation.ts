import { z } from 'zod';

const EmailStatusSchema = z.enum([
  'none',
  'error',
  'verified',
  'locked',
  'code_sent',
  'expired',
  'not-match',
  'registered',
]);

export const RoleSchema = z.enum(['admin', 'member']);
export const VirtualLabPayloadSchema = z.object({
  name: z.string().describe('name of the virtual lab'),
  description: z.string().optional().describe('optional description of the virtual lab'),
  reference_email: z.string().email().describe('reference email associated with the virtual lab'),
  entity: z.string().describe('entity or organization associated with the virtual lab'),
  include_members: z
    .array(
      z.object({
        email: z.string().email().describe('email of the member to be included'),
        role: RoleSchema.describe('role assigned to the member'),
      })
    )
    .nullable()
    .describe('list of members to be included in the virtual lab'),
  plan_id: z.string().optional().describe('optional plan ID for the virtual lab subscription'),
  email_status: EmailStatusSchema.describe('status of the reference email verification'),
});

export const ProjectPayloadSchema = z.object({
  name: z.string().describe('Name of the project'),
  description: z.string().optional().describe('Optional description of the project'),
  include_members: z
    .array(
      z.object({
        email: z.string().email().describe('Email of the member to be included'),
        role: RoleSchema.describe('Role assigned to the member'),
      })
    )
    .nullable()
    .describe('List of members to be included in the project'),
});

export const CreateSubscriptionRequestSchema = z.object({
  virtualLabId: z.string().uuid().describe('id of the virtual lab to subscribe'),
  priceId: z.string().describe('selected stripe price id'),
  paymentMethodId: z.string().describe('stripe payment method id to use for billing'),
  metadata: z.record(z.string()).optional().describe('additional metadata for the subscription'),
});
