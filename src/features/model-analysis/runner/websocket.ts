import WsCommon, { OnMessageHandler } from '@/services/ws-common';

export const TransportRunnerCommandsPrefix = {
  // Cmd target: backend
  RUN_ANALYSIS: 'run_analysis',
  PING: 'ping',
} as const;

export enum ModelOrigin {
  NEXUS = 'nexus',
  ENTITYCORE = 'entitycore',
}

const PING_INTERVAL = 60_000;

type TransportRunnerCommandsPrefixKeys = Lowercase<keyof typeof TransportRunnerCommandsPrefix>;

export type TransportRunnerCommands =
  | `${TransportRunnerCommandsPrefixKeys}_done`
  | `${TransportRunnerCommandsPrefixKeys}_processing`
  | `${TransportRunnerCommandsPrefixKeys}_error`;

export default class Ws extends WsCommon<TransportRunnerCommands> {
  private pingIntervalTimerId?: number;

  constructor(
    webSocketUrl: string,
    token: string,
    {
      onMessage,
      onClose,
      onOpen,
    }: {
      onMessage: OnMessageHandler<TransportRunnerCommands>;
      onOpen?: () => void;
      onClose?: () => void;
    }
  ) {
    const params = {
      onMessage,
      onOpen: () => {
        onOpen?.();
        this.pingIntervalTimerId = window.setInterval(() => {
          this.send(TransportRunnerCommandsPrefix.PING, {});
        }, PING_INTERVAL);
      },
      onClose: () => {
        onClose?.();
        window.clearInterval(this.pingIntervalTimerId);
      },
    };
    super(webSocketUrl, token, params);
  }
}
