import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

export interface ContentForEmail {
  label: string;
  email: string;
}

export type EmailType = 'supportEmailButton' | 'infoEmailButton';

function isContentForEmail(data: unknown): data is ContentForEmail {
  return tryType('ContentForEMail', data, { label: 'string', email: 'string' });
}

export async function getEmailContent(type: EmailType): Promise<ContentForEmail | null> {
  try {
    const data = await getClient().fetch(
      `*[_type=="${type}"][0]{
  label,
  email
}`
    );
    if (isContentForEmail(data)) return data;
  } catch (ex) {
    logError('Error fetching email content:', ex);
  }
  return null;
}
