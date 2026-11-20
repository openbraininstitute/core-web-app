import { config } from '@/config';

export const settings = {
  collaboration: {
    /** Seconds a hidden tab keeps its collaboration socket; 0: never. */
    hiddenPauseS: config.LOGBOOK_COLLABORATION_HIDDEN_PAUSE_S,
  },
  upload: {
    /** Largest upload from this computer, in MB. */
    maxMb: config.LOGBOOK_UPLOAD_MAX_MB,
  },
} as const;
