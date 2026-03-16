import { z } from 'zod';

export const EmailStatusSchema = z.enum([
  'none',
  'error',
  'verified',
  'locked',
  'code_sent',
  'expired',
  'not-match',
  'registered',
]);
export type TEmailStatus = z.infer<typeof EmailStatusSchema>;

export const UserRoleSchema = z.enum(['admin', 'member']);
export const VirtualLabPayloadSchema = z.object({
  name: z.string().describe('name of the virtual lab'),
  description: z.string().optional().describe('optional description of the virtual lab'),
  reference_email: z.email().describe('reference email associated with the virtual lab'),
  entity: z.string().describe('entity or organization associated with the virtual lab'),
  email_status: EmailStatusSchema.describe('status of the reference email verification'),
});

export type TVirtualLabPayload = z.infer<typeof VirtualLabPayloadSchema>;
export type TUserRole = z.infer<typeof UserRoleSchema>;

export const ProjectPayloadSchema = z.object({
  name: z.string().describe('Name of the project'),
  description: z.string().optional().describe('Optional description of the project'),
  include_members: z
    .array(
      z.object({
        id: z.uuid().optional().describe('ID of the member to be included'),
        email: z.email().describe('Email of the member to be included'),
        role: UserRoleSchema.describe('Role assigned to the member'),
      })
    )
    .nullable()
    .describe('List of members to be included in the project'),
});
export type TProjectPayload = z.infer<typeof ProjectPayloadSchema>;

export const CreateSubscriptionRequestSchema = z.object({
  virtualLabId: z.uuid().describe('id of the virtual lab to subscribe'),
  priceId: z.string().describe('selected stripe price id'),
  paymentMethodId: z.string().describe('stripe payment method id to use for billing'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe('additional metadata for the subscription'),
});
