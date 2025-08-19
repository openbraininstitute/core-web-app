import { useSanity } from '@/services/sanity';
import { AboutContentProps } from '@/ui/segments/help/about/content';
import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';

const queryForAboutContent = `*[_type=="ResourceHelpSection"][0] {
  aboutContent,
  aboutTheAppContent,
  termsAndConditionContent
}`;

export function useSanityContentForAboutContent(): AboutContentProps {
  return (
    useSanity(queryForAboutContent, isContentForAbout) ?? {
      aboutContent: [],
      aboutTheAppContent: [],
      termsAndConditionContent: [],
    }
  );
}

function isContentForAbout(data: unknown): data is AboutContentProps {
  try {
    assertType(
      data,
      {
        aboutContent: 'unknown',
        aboutTheAppContent: 'unknown',
        termsAndConditionContent: 'unknown',
      },
      'ContentForAbout'
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
