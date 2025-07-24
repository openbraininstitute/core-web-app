export enum JobStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
}

export enum MessageType {
  STATUS = 'status',
  DATA = 'data',
}

export type Message<T> = StatusMessage | DataMessage<T>;

type StatusMessage = {
  message_type: MessageType.STATUS;
  status: JobStatus;
  extra?: string;
};

type DataMessage<T> = {
  message_type: MessageType.DATA;
  data: T;
};
