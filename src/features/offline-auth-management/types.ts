export const OfflineTokenConsentEventType = {
  Granted: 'granted',
  Denied: 'denied',
} as const;

export type OfflineTokenConsentEventType =
  (typeof OfflineTokenConsentEventType)[keyof typeof OfflineTokenConsentEventType];

export const OfflineTokenConsentEventSource = {
  Callback: 'callback',
  Server: 'server',
} as const;

export type OfflineTokenConsentEventSource =
  (typeof OfflineTokenConsentEventSource)[keyof typeof OfflineTokenConsentEventSource];

export type OfflineTokenConsentDecision = 'granted' | 'denied';

export type OfflineTokenConsentEvent =
  | {
      type: typeof OfflineTokenConsentEventType.Granted;
      at: number;
      source: OfflineTokenConsentEventSource;
      sessionStateId?: string;
    }
  | {
      type: typeof OfflineTokenConsentEventType.Denied;
      at: number;
      source: typeof OfflineTokenConsentEventSource.Callback;
      sessionStateId?: string;
      error?: string;
      description?: string;
    };

export type OfflineTokenConsentState = {
  decision: OfflineTokenConsentDecision;
  updatedAt: number;
  sessionStateId?: string;
  error?: string;
  description?: string;
};
