import { config } from '@/config';

export const settings = {
  collaboration: {
    hiddenPauseS: config.LOGBOOK_COLLABORATION_HIDDEN_PAUSE_S,
  },
  upload: {
    maxMb: config.LOGBOOK_UPLOAD_MAX_MB,
  },
} as const;
