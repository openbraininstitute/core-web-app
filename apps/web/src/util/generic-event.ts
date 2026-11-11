import React from 'react';

import { logError } from '@/utils/logger';

export interface GenericEventInterface<T> {
  addListener(listener: (arg: T) => void): void;
  removeListener(listener: (arg: T) => void): void;
}

export default class GenericEvent<T = void> implements GenericEventInterface<T> {
  private listeners: Array<(arg: T) => void> = [];

  useValue(initialValue: T): T {
    const [value, setValue] = React.useState(initialValue);
    React.useEffect(() => {
      this.addListener(setValue);
      return () => this.removeListener(setValue);
    }, []);
    return value;
  }

  useState(initialValue: T): [T, (v: T) => void] {
    const [value, setValue] = React.useState(initialValue);
    React.useEffect(() => {
      this.addListener(setValue);
      return () => this.removeListener(setValue);
    }, []);
    return [
      value,
      (v: T) => {
        setValue(v);
        this.dispatch(v);
      },
    ];
  }

  addListener(listener: (arg: T) => void) {
    const { listeners } = this;
    if (listeners.includes(listener)) return;

    listeners.push(listener);
  }

  removeListener(listener: (arg: T) => void) {
    this.listeners = this.listeners.filter((item) => item !== listener);
  }

  dispatch(arg: T) {
    for (const listener of this.listeners) {
      try {
        listener(arg);
      } catch (ex) {
        logError('Error in an event listener!');
        logError('  error:   ', ex);
        logError('  listener:', listener);
      }
    }
  }
}

export { GenericEvent };

export function useGenericEventListener<T>(event: GenericEvent<T>, listener: (value: T) => void) {
  React.useEffect(() => {
    event.addListener(listener);
    return () => event.removeListener(listener);
  }, [event, listener]);
}
