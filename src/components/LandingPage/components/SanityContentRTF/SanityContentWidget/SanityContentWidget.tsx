import { WidgetCompanyMembers } from '@/components/LandingPage/widgets/CompanyMembers';
import { WidgetEmail } from '@/components/LandingPage/widgets/Email';
import WidgetMilestones from '@/components/LandingPage/widgets/milestones';
import WidgetMultipleMember from '@/components/LandingPage/widgets/multiple-member/multiple-member';
import WidgetPriceList from '@/components/LandingPage/widgets/PriceList';
import WidgetPriceList2 from '@/components/LandingPage/widgets/price-list-2/price-list-2';
import WidgetRepositories from '@/components/LandingPage/widgets/repositories';
import WidgetSpecialContributors from '@/components/LandingPage/widgets/special-contributors';
import { WidgetSwipeableList } from '@/components/LandingPage/widgets/swipeable-list';
import type { ContentForRichTextWidget } from '../../../content/types';
import {
  WidgetFromCellToBrain,
  WidgetHero,
  WidgetMissionStatement,
  WidgetNews,
  WidgetOurFoundations,
  WidgetVirtualLabsPanel,
} from '../../../widgets';
import { WidgetContributorsPanel } from '../../../widgets/ContributorsPanel';
import { WidgetPortalsPanel } from '../../../widgets/PortalsPanel';
import Error from '../../Error';

interface SanityContentWidgetProps {
  value: ContentForRichTextWidget;
}

export default function SanityContentWidget({ value }: SanityContentWidgetProps) {
  switch (value.name) {
    case 'downloadButton':
      return <WidgetMissionStatement />;
    case 'newsList':
      return <WidgetNews />;
    case 'tripleBloc':
      return <WidgetVirtualLabsPanel />;
    case 'highlight':
      return <WidgetOurFoundations />;
    case 'portalGrid':
      return <WidgetPortalsPanel />;
    case 'contributors':
      return <WidgetContributorsPanel />;
    case 'memberBoard':
    case 'memberExecutiveBoard':
    case 'memberTeam':
      return <WidgetCompanyMembers group={value.name} />;
    case 'smallCard':
      return <WidgetFromCellToBrain />;
    case 'supportEmailButton':
    case 'infoEmailButton':
      return <WidgetEmail type={value.name} />;
    case 'itemPriceList':
      return <WidgetPriceList />;
    case 'plansList':
      return <WidgetPriceList2 />;
    case 'heroContent':
      return <WidgetHero />;
    case 'swipeableList':
      return <WidgetSwipeableList />;
    case 'multipleMember':
      return <WidgetMultipleMember />;
    case 'repositories':
    case 'resourcesList':
      return <WidgetRepositories />;
    case 'specialContributors':
      return <WidgetSpecialContributors />;
    case 'milestones':
      return <WidgetMilestones />;
    case 'multipleButton':
      return <pre>{JSON.stringify(value, null, '  ')}</pre>;
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
