const ReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

const RECONNECT_TIMEOUT = 3000;
const POLLING_INTERVAL = 5000;

const APIGatewayResponse = {
  RETRY: 'Retry later',
  PROCESSING: 'Processing message',
};

type Message = string;
type Data = any;
type CmdId = number;
type MessageQueueEntry = [Message, Data, CmdId | undefined];
export type OnMessageHandler<Cmd> = (cmd: Cmd, data: any) => void;

export default class WsCommon<Cmd> {
  private cmdId: number = 0;

  private closing: boolean = false;

  private messageQueue: MessageQueueEntry[] = [];

  private messageContext?: any;

  private onMessage: OnMessageHandler<Cmd>;

  private onOpen?: () => void;

  private onClose?: () => void;

  private requestResolvers = new Map<number, (data: Data) => void>();

  private webSocketUrl: string;

  private socket!: WebSocket;

  private serviceUp = false;

  private token?: string;

  constructor(
    webSocketUrl: string,
    token: string,
    {
      onMessage,
      onOpen,
      onClose,
    }: { onMessage: OnMessageHandler<Cmd>; onOpen: () => void; onClose: () => void }
  ) {
    this.webSocketUrl = webSocketUrl;

    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;

    this.token = token;

    this.init();
  }

  send(message: Message, data?: Data, cmdId?: CmdId) {
    if (this.closing) {
      throw new Error('Can not use a closing websocket');
    }
    // as we need to wait for the service to be up, we queue the messages
    if (!this.serviceUp) {
      this.messageQueue.push([message, data, cmdId]);
    } else {
      this._send(message, data, cmdId);
    }
  }

  _send(message: Message, data?: Data, cmdId?: CmdId) {
    if (this.socket.readyState !== ReadyState.OPEN || !this.serviceUp) {
      throw new Error('Websocket is not open');
    }

    this.socket.send(
      JSON.stringify({
        cmd: message,
        cmdid: cmdId,
        context: this.messageContext,
        data,
        timestamp: Date.now(),
      })
    );
  }

  async request(message: Message, data: Data) {
    if (this.closing) {
      throw new Error('Can not use a closing websocket');
    }

    const currentCmdId = this.cmdId;
    this.cmdId += 1;

    const response = new Promise<Data>((resolve) => {
      this.requestResolvers.set(currentCmdId, resolve);
    });
    this.send(message, data, currentCmdId);
    return response;
  }

  destroy() {
    if (this.closing) {
      throw new Error('Websocket is already being destroyed');
    }

    this.closing = true;

    this.requestResolvers = new Map();
    this.messageQueue = [];

    this.socket.close();
  }

  sendCheckUpMsg() {
    if (this.socket.readyState !== ReadyState.OPEN) return;
    if (this.serviceUp) return;

    this.socket.send(JSON.stringify({}));
  }

  private init = () => {
    if (this.closing) return;

    const socket = new WebSocket(this.webSocketUrl, `Bearer-${this.token}`);
    this.socket = socket;

    // send message to check until the service is up
    socket.addEventListener('open', () => {
      this.sendCheckUpMsg();
      this.onOpen?.();
    });

    socket.addEventListener('close', () => {
      this.onClose?.();
      this.reconnect();
    });

    socket.addEventListener('message', (e) => {
      const message = JSON.parse(e.data);

      // coming as status messages from single-cell api gateway
      const apiGatewayMsg = message?.message;
      switch (apiGatewayMsg) {
        case APIGatewayResponse.RETRY:
          setTimeout(() => this.sendCheckUpMsg(), POLLING_INTERVAL);
          return;
        case APIGatewayResponse.PROCESSING:
          if (!this.serviceUp) {
            // process all messages sent while the service was warming up
            this.serviceUp = true;
            this.processQueue();
          }
          return;
        default:
          break;
      }

      const cmdId = message.data?.cmdid;
      if (cmdId) {
        const requestResolver = this.requestResolvers.get(cmdId);
        requestResolver?.(message.data);
        this.requestResolvers.delete(cmdId);
        return;
      }

      setTimeout(() => this.onMessage(message.cmd, message.data), 0);
    });
  };

  private reconnect = () => {
    if (this.closing) return;

    setTimeout(this.init, RECONNECT_TIMEOUT);
  };

  private processQueue = () => {
    if (this.closing) return;

    let queueLength = this.messageQueue.length;

    // TODO refactor

    while (queueLength--) {
      const message = this.messageQueue.shift();
      if (!message) return;

      this._send(...message);
    }
  };
}
