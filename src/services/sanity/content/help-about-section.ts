import { getClient } from '@/services/sanity/client';
import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';

export type AboutContentProps = {
  aboutContent: unknown;
  aboutTheAppContent: unknown;
  termsAndConditionContent: unknown;
};

const queryForAboutContent = `*[_type=="ResourceHelpSection"][0]{
  aboutContent,
  aboutTheAppContent,
  termsAndConditionContent
}`;

function isContentForAbout(data: unknown): data is AboutContentProps {
  try {
    assertType(
      data,
      {
        aboutContent: 'unknown',
        aboutTheAppContent: 'unknown',
        termsAndConditionContent: 'unknown',
      },
      'ContentForAbout',
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}

export async function getAboutContent(): Promise<AboutContentProps> {
  try {
    const data = await getClient().fetch<AboutContentProps>(queryForAboutContent);
    if (isContentForAbout(data)) return data;
  } catch (err) {
    logError(err);
  }

  return {
    aboutContent: [],
    aboutTheAppContent: [],
    termsAndConditionContent: [],
  };
}
