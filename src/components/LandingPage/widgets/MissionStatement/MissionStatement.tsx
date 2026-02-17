import { IconDownloadFile } from '@/components/LandingPage/icons/IconDownloadFile';
import { classNames } from '@/util/utils';

import ProgressiveImage from '../../components/ProgressiveImage';
import { styleBlockSmall } from '../../styles';
import { useSanityContentForOurMissionDownload } from './hooks';

import styles from './MissionStatement.module.css';

interface WidgetMissionStatementProps {
  className?: string;
}

export function WidgetMissionStatement({ className }: WidgetMissionStatementProps) {
  const { title, documentURL, imageURL, imageWidth, imageHeight } =
    useSanityContentForOurMissionDownload();

  const handleDownload = () => {
    window.open(documentURL);
  };
  return (
    <button
      type="button"
      className={classNames(className, styles.missionStatement, styleBlockSmall)}
      onClick={handleDownload}
    >
      <div className={styles.text}>
        <h2>{title}</h2>
        {/* <Text raw value={description} /> */}
      </div>
      <div className={styles.background}>
        <ProgressiveImage
          className={styles.image}
          src={imageURL}
          width={imageWidth}
          height={imageHeight}
          alt={title}
        />
        <div className={styles.icon}>
          <IconDownloadFile />
        </div>
      </div>
    </button>
  );
}
