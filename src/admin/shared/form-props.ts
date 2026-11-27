import dayjs from 'dayjs';

import type { Dayjs } from 'dayjs';

/** A form date held as the API's ISO string, so an untouched one compares equal. */
export const dateTimeItemProps = {
  getValueProps: (value?: string) => ({ value: value ? dayjs(value) : undefined }),
  normalize: (date?: Dayjs | null) => date?.toISOString(),
};

/** Modal props that keep a dialog open while its save is in flight. */
export const lockWhilePending = (pending: boolean, onClose: () => void) => ({
  onCancel: () => {
    if (!pending) onClose();
  },
  closable: !pending,
  maskClosable: !pending,
  keyboard: !pending,
});
