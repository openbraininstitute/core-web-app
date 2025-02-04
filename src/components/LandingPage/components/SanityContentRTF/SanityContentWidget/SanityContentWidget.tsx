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
      return <WidgetEmail type={value.name} />;
    case 'itemPriceList':
      return <WidgetPriceList />;
    case 'heroContent':
      return <WidgetHero />;
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
