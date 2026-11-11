/** Typed arrays that double their buffer when a push does not fit; `trimmed` copies out what was pushed. */

export class GrowableFloat32 {
  data: Float32Array;
  length = 0;
  constructor(capacity: number) {
    this.data = new Float32Array(capacity);
  }
  push(a: number): void {
    if (this.length + 1 > this.data.length) this.grow();
    this.data[this.length++] = a;
  }
  push3(a: number, b: number, c: number): void {
    if (this.length + 3 > this.data.length) this.grow();
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
  }
  private grow(): void {
    const next = new Float32Array(this.data.length * 2);
    next.set(this.data);
    this.data = next;
  }
  trimmed(): Float32Array {
    return this.data.slice(0, this.length);
  }
}

/** Triangles: three vertex indices at a time. */
export class GrowableUint32 {
  data: Uint32Array;
  length = 0;
  constructor(capacity: number) {
    this.data = new Uint32Array(capacity);
  }
  push(a: number, b: number, c: number): void {
    if (this.length + 3 > this.data.length) this.grow();
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
  }
  private grow(): void {
    const next = new Uint32Array(this.data.length * 2);
    next.set(this.data);
    this.data = next;
  }
  trimmed(): Uint32Array {
    return this.data.slice(0, this.length);
  }
}

export class GrowableUint8 {
  data: Uint8Array;
  length = 0;
  constructor(capacity: number) {
    this.data = new Uint8Array(capacity);
  }
  push(a: number): void {
    if (this.length + 1 > this.data.length) {
      const next = new Uint8Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = a;
  }
  trimmed(): Uint8Array {
    return this.data.slice(0, this.length);
  }
}
