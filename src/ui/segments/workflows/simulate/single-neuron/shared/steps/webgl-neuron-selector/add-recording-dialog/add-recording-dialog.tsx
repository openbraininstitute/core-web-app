import React from 'react';
import { useAtom } from 'jotai';

import { PainterManager } from '../painter';
import { RecordLocationConfigurationAtomFamily } from '../../../context';
import { RECORDING_LOCATION_CONFIGURATION_SESSION_KEY } from '../../../constant';
import { getSessionKey } from '../../../helpers';
import { getColor } from '../colors';

import { classNames } from '@/util/utils';
import { IconClose } from '@/components/LandingPage/icons/IconClose';

import styles from './add-recording-dialog.module.css';

export interface AddRecordingDialogProps {
  className?: string;
  sessionId: string;
  painterManager: PainterManager;
}

export default function AddRecordingDialog({
  className,
  sessionId,
  painterManager,
}: AddRecordingDialogProps) {
  const key = getSessionKey(RECORDING_LOCATION_CONFIGURATION_SESSION_KEY, sessionId);
  const [state, update] = useAtom(RecordLocationConfigurationAtomFamily(key));
  const [open, setOpen] = React.useState(false);
  const { offset, item } = painterManager.eventTap.useValue({
    offset: 0,
    item: null,
  });
  React.useEffect(() => {
    if (item) setOpen(true);
  }, [item, offset]);
  const handleMoveInjection = () => {
    setOpen(false);
  };
  const handleAddRecording = () => {
    setOpen(false);
    if (!item) return;

    update([
      ...state,
      {
        offset,
        origin: 'recording',
        color: getColor(state.length),
        record_currents: false,
        section: item.sectionName,
      },
    ]);
  };

  return (
    <div className={classNames(className, styles.addRecordingDialog, open && styles.open)}>
      <div>
        <h2>{item?.name}</h2>
        <div className={styles.buttons}>
          <button type="button" onClick={handleMoveInjection}>
            Move injection here
          </button>
          <button type="button" onClick={handleAddRecording}>
            Add recording
          </button>
        </div>
        <hr />
        <footer>
          <button type="button" onClick={() => setOpen(false)}>
            <IconClose />
            <div>Cancel</div>
          </button>
        </footer>
      </div>
    </div>
  );
}
