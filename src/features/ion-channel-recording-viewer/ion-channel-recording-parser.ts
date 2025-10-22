/* eslint-disable max-classes-per-file */
import { File, Group, Dataset, ready, Entity } from 'h5wasm';

export class IonChannelRecordingParser {
  static async create(id: string, nwbArrayBuffer: ArrayBuffer) {
    const { FS } = await ready;

    const filename = `${id}.nwb`;

    try {
      // TODO: Is there a better way to check if the file exists?
      FS.stat(filename);
    } catch (error: any) {
      if (error?.message === 'FS error') {
        FS.writeFile(filename, new Uint8Array(nwbArrayBuffer));
      }
    }

    const file = new File(`${id}.nwb`, 'r');
    const trace = new IonChannelRecordingParser(file);
    trace.debug();
    return trace;
  }

  private constructor(private readonly file: File) {}

  public debug() {
    // eslint-disable-next-line no-console
    console.log('Hierarchy of the H5 file:');
    for (const key of this.file.keys()) {
      const group = this.file.get(key);
      this.debugGroup(key, group);
    }
  }

  private debugGroup(name: string, entity: Entity | null, indentation: number = 0) {
    if (!entity) return;

    const indent = `${'|  '.repeat(indentation)}`;
    if (entity instanceof Group) {
      const group = entity;
      // eslint-disable-next-line no-console
      console.log(
        `${indent}${name}`,
        `{${Object.keys(group.attrs)
          .map((key) => `${key}: ${JSON.stringify(group.attrs[key])}`)
          .join(', ')}}`
      );
      for (const key of group.keys()) {
        this.debugGroup(key, group.get(key), indentation + 1);
      }
      return;
    }
    if (entity instanceof Dataset) {
      const dataset = entity;
      // eslint-disable-next-line no-console
      console.log(
        `${indent}${name} {${Object.keys(dataset.attrs)
          .map((key) => `${key}: ${JSON.stringify(dataset.attrs[key])}`)
          .join(', ')}}  -  dataset(${dataset.shape})`
      );
    }
  }

  /**
   * Utility method to retrieve a group from the NWB file.
   * @param key
   * @returns
   */
  private getGroup(key: string): Group {
    const group = this.file.get(key);
    if (!(group instanceof Group)) {
      throw new Error(`Group ${key} not found`);
    }
    return group;
  }

  /**
   * The standard error thrown by `dataset.get_attribute()`
   * does not output the name of the missing attribute.
   *
   * This function does.
   */
  private getAttribute(entity: Group | Dataset, name: string) {
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

function isStimulus(stimulus: unknown): stimulus is [number, number, number, number] {
  if (!Array.isArray(stimulus)) return false;
  if (stimulus.length < 4) return false;
  for (const value of stimulus) {
    if (typeof value !== 'number') return false;
  }
  return true;
}
