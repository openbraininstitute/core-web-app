import { z } from 'zod';

import { useSanity } from '@/services/sanity';
import { AboutContentProps } from '@/ui/segments/help/about/content';
import { logError } from '@/util/logger';

const queryForAboutContent = `*[_type=="ResourceHelpSection"][0] {
  aboutContent,
  aboutTheAppContent,
  termsAndConditionContent
}`;

const AboutContentSchema = z.object({
  aboutContent: z.unknown(),
  aboutTheAppContent: z.unknown(),
  termsAndConditionContent: z.unknown(),
});

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
    AboutContentSchema.parse(data);
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
