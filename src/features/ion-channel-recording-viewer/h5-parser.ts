import { File, Group, Dataset, Entity } from 'h5wasm';

import { logWarn } from '@/utils/logger';

export class H5Parser {
  protected constructor(private readonly file: File) {}

  public debug(item?: File | Group | Dataset) {
    if (item instanceof Dataset) {
      // eslint-disable-next-line no-console
      console.log(`Dataset(${item.shape})`, this.stringifyAttributes(item));
      return;
    }

    const root = item ?? this.file;
    for (const key of root.keys()) {
      const entity = root.get(key);
      this.debugGroup(key, entity);
    }
  }

  private debugGroup(name: string, entity: Entity | null, indentation: number = 0) {
    if (!entity) return;

    const indent = `${'|  '.repeat(indentation)}`;
    if (this.isGroup(entity)) {
      const group = entity;
      // eslint-disable-next-line no-console
      console.log(`${indent}${name}`, this.stringifyAttributes(group));
      for (const key of group.keys()) {
        this.debugGroup(key, group.get(key), indentation + 1);
      }
      return;
    }
    if (this.isDataset(entity)) {
      const dataset = entity;
      // eslint-disable-next-line no-console
      console.log(
        `${indent}${name}`,
        this.stringifyAttributes(dataset),
        ` -  dataset(${dataset.shape})`
      );
    }
  }

  protected stringifyAttributes(obj: Group | Dataset) {
    return `{${Object.keys(obj.attrs)
      .map((key) => `${key}: ${JSON.stringify(obj.attrs[key])}`)
      .join(', ')}}`;
  }

  protected getArray<T>(
    path: string[],
    typeguard: (value: unknown) => value is T = isArray<T>
  ): T | null {
    const dataset = this.get(...path);
    if (!this.isDataset(dataset)) return null;

    const array = dataset.to_array();
    if (!typeguard(array)) return null;

    return array;
  }

  protected getArrayNumber(...path: string[]): number[] | null {
    return this.getArray(path, isArrayNumber);
  }

  protected getArrayNumber2D(...path: string[]): number[][] | null {
    return this.getArray(path, isArrayNumber2D);
  }

  protected get(...path: string[]): Group | Dataset | undefined {
    try {
      return this.tryGet(...path);
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : `${ex}`;
      logWarn(msg);
      return undefined;
    }
  }

  protected has(...path: string[]): boolean {
    try {
      this.tryGet(...path);
      return true;
    } catch {
      return false;
    }
  }

  protected tryGet(...path: string[]): Group | Dataset {
    let root: File | Group | Dataset = this.file;
    const journey: string[] = [];
    try {
      for (const key of path) {
        journey.push(key);
        if (this.isDataset(root)) throw Error('Dataset is a leave, you cannot go further!');

        const entity = root.get(key);
        if (!entity) throw new Error('No Group/Dataset found!');

        if (this.isGroup(entity) || this.isDataset(entity)) {
          root = entity;
        } else {
          throw new Error(`Unknown entity!`);
        }
      }
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : `${ex}`;
      throw new Error(
        `Unable to get path "${path.join('/')}" because of an error at "${journey.join('/')}": ${msg}`
      );
    }
    return root;
  }

  protected isGroup(entity: unknown): entity is Group {
    return entity instanceof Group;
  }

  protected isDataset(entity: unknown): entity is Dataset {
    return entity instanceof Dataset;
  }

  /**
   * The standard error thrown by `dataset.get_attribute()`
   * does not output the name of the missing attribute.
   *
   * This function does.
   */
  protected getAttribute(entity: Group | Dataset, name: string) {
    try {
      return entity.get_attribute(name, true);
    } catch {
      const attributesNames = Object.keys(entity.attrs);
      throw new Error(
        `Attribute "${name}" not found in dataset!\n${
          attributesNames.length === 0
            ? `This ${entity instanceof Group ? 'Group' : 'Dataset'} has no attribute.`
            : `Available attributes are: ${attributesNames.join(', ')}.`
        }`
      );
    }
  }

  public destroy() {
    this.file.close();
  }
}

function isArray<T>(value: unknown): value is T {
  return Array.isArray(value);
}

function isArrayNumber(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;

  for (const item of value) {
    if (typeof item !== 'number') return false;
  }
  return true;
}

function isArrayNumber2D(value: unknown): value is number[][] {
  if (!Array.isArray(value)) return false;

  for (const item1 of value) {
    if (!Array.isArray(item1)) return false;

    for (const item2 of item1) {
      if (typeof item2 !== 'number') return false;
    }
  }
  return true;
}
