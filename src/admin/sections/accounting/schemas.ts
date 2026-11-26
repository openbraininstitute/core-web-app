import * as z from 'zod';

import { AccountingSubtype, ChargeType } from './types';

export const REASON_MAX_LENGTH = 500;

const id = z.guid();

/** Credits as a decimal string, so no float rounding ever touches money. */
export const Amount = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,2})?$/, 'Use a number like 12.50, with at most 2 decimals')
  .refine((value) => /[1-9]/.test(value), 'Has to be more than 0');

export const TopUpBody = z.strictObject({ vlab_id: id, amount: Amount });
export const AssignBody = z.strictObject({ vlab_id: id, proj_id: id, amount: Amount });
export const ReverseBody = AssignBody;
export const MoveBody = z.strictObject({
  vlab_id: id,
  debited_from: id,
  credited_to: id,
  amount: Amount,
});
export const GrantBody = z.strictObject({ proj_id: id, amount: Amount });
export const DepleteProjectBody = z.strictObject({ proj_id: id });
export const DepleteVlabBody = z.strictObject({ vlab_id: id });
export const AccountStatusBody = z.strictObject({ enabled: z.boolean() });
export const RefundBody = z.strictObject({
  job_id: id,
  amount: Amount.optional(),
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

const START_GRACE_MS = 5 * 60_000;

const dateTime = z.iso.datetime({ offset: true });
const notPast = dateTime.refine(
  (value) => Date.parse(value) >= Date.now() - START_GRACE_MS,
  "Can't be in the past"
);

/** A share of the cost, `0.2` for 20% off, as a decimal string. */
export const Fraction = z
  .string()
  .regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/, 'Use a fraction from 0 to 1, with at most 6 decimals');

const endsAfterStart = ({
  valid_from: from,
  valid_to: to,
}: {
  valid_from?: string;
  valid_to?: string | null;
}) => !from || !to || Date.parse(to) > Date.parse(from);
const END_AFTER_START = { message: 'Has to end after it starts', path: ['valid_to'] };

export const DiscountBody = z
  .strictObject({
    vlab_id: id,
    discount: Fraction,
    valid_from: notPast,
    valid_to: notPast.optional(),
  })
  .refine(endsAfterStart, END_AFTER_START);

export const DiscountPatchBody = z
  .strictObject({
    discount: Fraction.optional(),
    valid_from: notPast.optional(),
    valid_to: notPast.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Change at least one field')
  .refine(endsAfterStart, END_AFTER_START);

export const EmptyBody = z.strictObject({});

/** Accounting's own subtypes it refuses new prices for. */
export const LEGACY_SUBTYPES: string[] = [AccountingSubtype.MlRag, AccountingSubtype.MlRetrieval];
export const MAX_TIERS = 20;
export const MAX_QUANTITY = 2 ** 31 - 1;

/** A price figure as a decimal string; storage rates per byte-second need about 30 decimals. */
export const PriceDecimal = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,30})?$/, 'Use a number like 0.05, with at most 30 decimals');

const quantity = z.number().int().min(0).max(MAX_QUANTITY);

const PriceTier = z.strictObject({
  min_quantity: quantity,
  max_quantity: quantity.nullable(),
  fixed_cost: PriceDecimal,
  multiplier: PriceDecimal,
});

function tierProblem(tiers: z.infer<typeof PriceTier>[], serviceType: string) {
  const last = tiers.length - 1;
  if (last < 0) return null;
  const open = tiers.findIndex(
    ({ min_quantity: min, max_quantity: max }, index) =>
      index < last && (max === null || max <= min)
  );
  const apart = tiers.findIndex(
    ({ min_quantity: min }, index) => index > 0 && min !== tiers[index - 1].max_quantity
  );
  const checks: Array<[boolean, string]> = [
    [tiers[0].min_quantity !== 0, 'The first tier starts at 0'],
    [tiers[last].max_quantity !== null, 'The last tier has no upper end'],
    [
      serviceType === ChargeType.Storage && (last > 0 || /[1-9]/.test(tiers[0].fixed_cost)),
      'Storage takes one tier with no fixed cost',
    ],
    [open !== -1, `Tier ${open + 1} needs an end above its start`],
    [apart !== -1, `Tier ${apart + 1} has to start where the one before ends`],
  ];
  return checks.find(([failed]) => failed)?.[1] ?? null;
}

export const PriceBody = z
  .strictObject({
    service_type: z.enum(Object.values(ChargeType)),
    service_subtype: z
      .enum(Object.values(AccountingSubtype))
      .refine((subtype) => !LEGACY_SUBTYPES.includes(subtype), 'No new prices for this subtype'),
    valid_from: notPast,
    valid_to: notPast.nullable(),
    vlab_id: id.nullable(),
    tiers: z.array(PriceTier).min(1).max(MAX_TIERS),
  })
  .refine(endsAfterStart, END_AFTER_START)
  .superRefine((body, context) => {
    const problem = tierProblem(body.tiers, body.service_type);
    if (problem) context.addIssue({ code: 'custom', message: problem, path: ['tiers'] });
  });

export const ExpirePriceBody = z.strictObject({ valid_to: notPast.optional() });
