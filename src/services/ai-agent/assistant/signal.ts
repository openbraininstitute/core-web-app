/* eslint-disable react-hooks/rules-of-hooks */
import React from 'react';

import GenericEvent from '@/util/generic-event';

export class Signal<T> {
  private value: T;

  public readonly event = new GenericEvent<T>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  readonly set = (value: T) => {
    if (value === this.value) return;

    this.value = value;
    this.event.dispatch(value);
  };

  use(): [value: T, setValue: (value: T) => void] {
    const [value, setValue] = React.useState(this.value);
    React.useEffect(() => {
      setValue(this.value);
      this.event.addListener(setValue);
      return () => this.event.removeListener(setValue);
    }, []);
    return [value, this.set];
  }

  useValue() {
    const [value] = this.use();
    return value;
  }
}
