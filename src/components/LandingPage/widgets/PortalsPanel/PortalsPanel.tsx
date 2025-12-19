import {
  useSanityContentForPortalsList,
  useSanityContentForPortalsTitle,
} from '@/components/LandingPage/content/portals';
import { classNames } from '@/util/utils';
import { styleBlockFullWidthPadded } from '../../styles';
import PortalCard from './card/PortalCard';

import styles from './PortalsPanel.module.css';

interface WidgetPortalsPanelProps {
  className?: string;
}

export function WidgetPortalsPanel({ className }: WidgetPortalsPanelProps) {
  const title = useSanityContentForPortalsTitle();
  const portals = useSanityContentForPortalsList();

  return (
    <>
      <h1>{title}</h1>
      <div className={classNames(className, styles.portalsPanel, styleBlockFullWidthPadded)}>
        {portals.map((portal) => (
          <PortalCard key={portal.link} value={portal} />
        ))}
      </div>
    </>
  );
}
