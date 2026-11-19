// The logbook's settings, read from the app config (src/config/schema.ts), which checks them once.
import { config } from '@/config';

export const settings = {
  collaboration: {
    /** Seconds a hidden tab keeps its collaboration socket (collaboration/idle.ts); 0: never. */
    hiddenPauseS: config.LOGBOOK_COLLABORATION_HIDDEN_PAUSE_S,
  },
  upload: {
    /** Largest file uploaded from this computer, in MB (log/uploads.ts). */
    maxMb: config.LOGBOOK_UPLOAD_MAX_MB,
  },
} as const;
