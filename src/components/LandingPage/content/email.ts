import { useSanity } from './content';
import { tryType } from './_common';

export interface ContentForEMail {
  label: string;
  email: string;
}

export type EMailTypes = 'supportEmailButton' | 'infoEmailButton';

export function useSanityContentForEMail(type: EMailTypes): ContentForEMail | null {
  return (
    useSanity(
      `*[_type=="${type}"][0]{
  label,
  email
}`,
      isContentForEMail
    ) ?? null
  );
}

function isContentForEMail(data: unknown): data is ContentForEMail {
  return tryType('ContentForEMail', data, { label: 'string', email: 'string' });
}
