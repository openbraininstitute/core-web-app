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
  entity: z.string().describe('entity or organization associated with the virtual lab'),
});

export type TVirtualLabPayload = z.infer<typeof VirtualLabPayloadSchema>;
export type TUserRole = z.infer<typeof UserRoleSchema>;

export const ProjectPayloadSchema = z.object({
  name: z.string().describe('Name of the project'),
  description: z.string().optional().describe('Optional description of the project'),
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
