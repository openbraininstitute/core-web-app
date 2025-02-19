import React from 'react';

import { ContentForRichTextWidget } from '../../../content/types';
import {
  WidgetMissionStatement,
  WidgetOurFoundations,
  WidgetVirtualLabsPanel,
  WidgetNews,
  WidgetFromCellToBrain,
  WidgetHero,
} from '../../../widgets';
import { WidgetPortalsPanel } from '../../../widgets/PortalsPanel';
import Error from '../../Error';
import { WidgetContributorsPanel } from '../../../widgets/ContributorsPanel';
import { WidgetCompanyMembers } from '@/components/LandingPage/widgets/CompanyMembers';
import { WidgetEmail } from '@/components/LandingPage/widgets/Email';
import WidgetPriceList from '@/components/LandingPage/widgets/PriceList';
import { WidgetSwipeableList } from '@/components/LandingPage/widgets/swipeable-list';
import WidgetMultipleMember from '@/components/LandingPage/widgets/multiple-member/multiple-member';
import WidgetPriceList2 from '@/components/LandingPage/widgets/price-list-2/price-list-2';
import WidgetRepositories from '@/components/LandingPage/widgets/repositories';

export interface SanityContentWidgetProps {
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
      return <WidgetRepositories />;
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
