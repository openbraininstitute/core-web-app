export type LowCreditsMessages = {
  /** notification title. Generic on purpose; shared by every activity */
  title: string;
  /** body shown to a virtual lab admin, who can buy or transfer credits */
  adminDescription: string;
  /** body shown to a non-admin, who must ask an admin for credits */
  nonAdminDescription: string;
  /** label of the button that opens the buy/transfer modal (admins only) */
  actionLabel: string;
  /** label of the link that emails the lab admin (non-admins only) */
  contactAdminLabel: string;
};

/** generic title used by every low-credits notification */
export const LOW_CREDITS_TITLE = 'Not enough credits';

/** Fallback subject when a call site does not provide one */
export const DEFAULT_LOW_CREDITS_SUBJECT = 'complete this action';

/**
 * builds the full message set from a subject, e.g. `subject: 'run the notebook'`
 * yields "This project does not have enough credits to run the notebook. ..."
 */
export function buildLowCreditsMessages(
  subject: string = DEFAULT_LOW_CREDITS_SUBJECT
): LowCreditsMessages {
  return {
    title: LOW_CREDITS_TITLE,
    adminDescription: `This project does not have enough credits to ${subject}. Buy or transfer credits and try again.`,
    nonAdminDescription: `This project does not have enough credits to ${subject}. Please contact your project administrator to request additional credits.`,
    actionLabel: 'Buy or transfer credits',
    contactAdminLabel: 'Contact administrator',
  };
}

export const defaultLowCreditsMessages = buildLowCreditsMessages();

/** subject line used for the "contact administrator" mailto link */
export const LOW_CREDITS_EMAIL_SUBJECT = 'Insufficient credits';
