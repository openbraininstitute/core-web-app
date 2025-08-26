'use client';

import { isType } from './type-guards';

const SUFFIX = '\t\t{ SharedSessionStorage }\n';

/**
 * SessionStorage is more restrictive than LocalStorage.
 * Data in it cannot be shared between two tabs, even if
 * they have the same URL.
 */
class SharedSessionStorage {
  private readonly channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('SharedSessionStorage');
    this.channel.addEventListener('message', this.handleMessage);
    this.channel.postMessage({ type: 'get' });
  }

  getItem(name: string) {
    return globalThis.sessionStorage.getItem(key(name));
  }

  setItem(name: string, value: string) {
    globalThis.sessionStorage.setItem(key(name), value);
    this.send(key(name));
  }

  private readonly handleMessage = (event: MessageEvent) => {
    try {
      const { data } = event;
      if (isMessageSet(data)) {
        if (typeof data.value === 'string') {
          globalThis.sessionStorage.setItem(key(data.name), data.value);
        }
      } else if (isMessageGet(data)) {
        for (let index = 0; index < globalThis.sessionStorage.length; index++) {
          const k = globalThis.sessionStorage.key(index);
          if (!k || !k.endsWith(SUFFIX)) continue;

          this.send(k);
        }
      }
    } catch {
      // Ignore this message.
    }
  };

  private send(k: string) {
    const name = k.slice(0, k.length - SUFFIX.length);
    const value = globalThis.sessionStorage.getItem(k);
    if (typeof value === 'string') {
      this.channel.postMessage({
        type: 'set',
        name,
        value,
      });
    }
  }
}

function key(k: string) {
  return `${k}${SUFFIX}`;
}

type MessageSet = {
  type: 'set';
  name: string;
  value: string | null;
};

function isMessageSet(data: unknown): data is MessageSet {
  return isType(data, {
    type: ['literal', 'set'],
    name: 'string',
    value: ['|', 'string', 'null'],
  });
}

type MessageGet = {
  type: 'get';
};

function isMessageGet(data: unknown): data is MessageGet {
  return isType(data, {
    type: ['literal', 'get'],
  });
}

export const sharedSessionStorage = new SharedSessionStorage();
