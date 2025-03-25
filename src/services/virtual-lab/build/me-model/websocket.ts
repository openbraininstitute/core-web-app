import WsCommon, { OnMessageHandler } from '@/services/ws-common';

export const BluePyEModelCmd = {
  // Cmd target: backend
  SET_MODEL: 'set_model',
  RUN_ANALYSIS: 'run_analysis',
  PING: 'ping',
};

const PING_INTERVAL = 60_000;

type BluePyEModelCmdKeys = Lowercase<keyof typeof BluePyEModelCmd>;

export type Cmd = `${BluePyEModelCmdKeys}_done` | `${BluePyEModelCmdKeys}_error`;

export default class Ws extends WsCommon<Cmd> {
  private pingIntervalTimerId?: number;

  constructor(
    webSocketUrl: string,
    token: string,
    {
      onMessage,
      onClose,
      onOpen,
    }: { onMessage: OnMessageHandler<Cmd>; onOpen?: () => void; onClose?: () => void }
  ) {
    const params = {
      onMessage,
      onOpen: () => {
        onOpen?.();
        this.pingIntervalTimerId = window.setInterval(() => {
          this.send(BluePyEModelCmd.PING, {});
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
