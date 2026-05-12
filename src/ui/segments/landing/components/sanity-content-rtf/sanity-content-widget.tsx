import { getAdoptersContent } from '@/services/sanity/api/get-adopters-content';
import { getCellToBrainContent } from '@/services/sanity/api/get-cell-to-brain';
import { getEmailContent } from '@/services/sanity/api/get-email-content';
import {
  getFoundationsLinks,
  getFoundationsText,
} from '@/services/sanity/api/get-foundations-content';
import { getMembers } from '@/services/sanity/api/get-members';
import { getMilestones } from '@/services/sanity/api/get-milestones';
import { getMissionDownload } from '@/services/sanity/api/get-mission-download';
import { getMultipleMember } from '@/services/sanity/api/get-multiple-member';
import { getNewsList } from '@/services/sanity/api/get-news-list';
import { getPortalsList, getPortalsTitle } from '@/services/sanity/api/get-portals-content';
import { getPriceListContent } from '@/services/sanity/api/get-price-list-content';
import { getPricingFeatures } from '@/services/sanity/api/get-pricing-features';
import { getRepositoriesContent } from '@/services/sanity/api/get-repositories-content';
import { getSpecialContributors } from '@/services/sanity/api/get-special-contributors';
import { getSwipeableList } from '@/services/sanity/api/get-swipeable-list';
import { getVirtualLabsBlocks } from '@/services/sanity/api/get-virtual-labs-content';
import { getWidgetHero } from '@/services/sanity/api/get-widget-hero';
import WidgetAdoptersLogo from '@/ui/segments/landing/widgets/adopters-logo/adopters-logo';
import { WidgetCompanyMembers } from '@/ui/segments/landing/widgets/company-members/company-members';
import { WidgetContributorsPanel } from '@/ui/segments/landing/widgets/contributors-panel/contributors-panel';
import { WidgetEmail } from '@/ui/segments/landing/widgets/email/email';
import { WidgetFromCellToBrain } from '@/ui/segments/landing/widgets/from-cell-to-brain/from-cell-to-brain';
import { WidgetHero } from '@/ui/segments/landing/widgets/hero/hero';
import WidgetMilestones from '@/ui/segments/landing/widgets/milestones/milestones';
import { WidgetMissionStatement } from '@/ui/segments/landing/widgets/mission-statement/mission-statement';
import WidgetMultipleMember from '@/ui/segments/landing/widgets/multiple-member/multiple-member';
import { WidgetNews } from '@/ui/segments/landing/widgets/news/news';
import { WidgetOurFoundations } from '@/ui/segments/landing/widgets/our-foundations/our-foundations';
import { WidgetPortalsPanel } from '@/ui/segments/landing/widgets/portals-panel/portals-panel';
import WidgetPriceList from '@/ui/segments/landing/widgets/price-list/price-list';
import WidgetPriceList2 from '@/ui/segments/landing/widgets/price-list-2/price-list-2';
import WidgetRepositories from '@/ui/segments/landing/widgets/repositories/repositories';
import WidgetSpecialContributors from '@/ui/segments/landing/widgets/special-contributors/special-contributors';
import { WidgetSwipeableList } from '@/ui/segments/landing/widgets/swipeable-list/swipeable-list';
import { WidgetVirtualLabsPanel } from '@/ui/segments/landing/widgets/virtual-labs-panel/virtual-labs-panel';
import { logError } from '@/util/logger';

import Error from '../error';

import type { EmailType } from '@/services/sanity/api/get-email-content';
import type { ContentForRichTextWidget } from '@/services/sanity/types/rtf-content';

interface SanityContentWidgetProps {
  value: ContentForRichTextWidget;
}

export default async function SanityContentWidget({ value }: SanityContentWidgetProps) {
  switch (value.name) {
    case 'downloadButton': {
      const data = await getMissionDownload();
      return <WidgetMissionStatement data={data} />;
    }
    case 'newsList': {
      const data = await getNewsList(4);
      return <WidgetNews data={data} />;
    }
    case 'tripleBloc': {
      const data = await getVirtualLabsBlocks();
      return <WidgetVirtualLabsPanel data={data} />;
    }
    case 'highlight': {
      const [text, links] = await Promise.all([getFoundationsText(), getFoundationsLinks()]);
      return <WidgetOurFoundations text={text} links={links} />;
    }
    case 'portalGrid': {
      const [title, list] = await Promise.all([getPortalsTitle(), getPortalsList()]);
      return <WidgetPortalsPanel title={title} list={list} />;
    }
    case 'contributors':
      return <WidgetContributorsPanel />;
    case 'memberBoard':
    case 'memberExecutiveBoard':
    case 'memberTeam': {
      const data = await getMembers();
      return <WidgetCompanyMembers group={value.name} data={data} />;
    }
    case 'smallCard': {
      const data = await getCellToBrainContent();
      return <WidgetFromCellToBrain data={data} />;
    }
    case 'supportEmailButton':
    case 'infoEmailButton': {
      const data = await getEmailContent(value.name as EmailType);
      return <WidgetEmail data={data} />;
    }
    case 'itemPriceList': {
      const data = await getPricingFeatures();
      return <WidgetPriceList data={data} />;
    }
    case 'plansList': {
      const data = await getPriceListContent();
      return <WidgetPriceList2 data={data} />;
    }
    case 'heroContent': {
      const data = await getWidgetHero();
      return <WidgetHero data={data} />;
    }
    case 'swipeableList': {
      const data = await getSwipeableList();
      return <WidgetSwipeableList data={data} />;
    }
    case 'multipleMember': {
      const data = await getMultipleMember();
      return <WidgetMultipleMember data={data} />;
    }
    case 'repositories':
    case 'resourcesList': {
      const data = await getRepositoriesContent();
      return <WidgetRepositories data={data} />;
    }
    case 'specialContributors': {
      const data = await getSpecialContributors();
      return <WidgetSpecialContributors data={data} />;
    }
    case 'milestones': {
      const data = await getMilestones();
      return <WidgetMilestones data={data} />;
    }
    case 'multipleButton':
      logError('Widget "multipleButton" is not implemented', value);
      return null;
    case 'adopters':
    case 'adoptersLogo':
    case 'earlyAdopters': {
      const data = await getAdoptersContent();
      return <WidgetAdoptersLogo data={data} />;
    }
    default:
      return (
        <Error>
          Unknown widget{' '}
          <code>
            <strong>{value.name}</strong>
          </code>
        </Error>
      );
  }
}
