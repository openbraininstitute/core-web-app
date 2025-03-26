import Dexie, { type EntityTable } from 'dexie';

type ClickType = 'brain_region' | 'artifact' | 'data_type';

interface Click {
  type: ClickType;
  data: string;
  timestamp: number;
}

interface ClickTuple {
  id?: number;
  clicks: Click[];
}

interface ActiveSession {
  key: string;
  value: ClickTuple;
}

class ClickContextTrackerDB extends Dexie {
  clickTuples!: EntityTable<ClickTuple, 'id'>;

  activeSession!: EntityTable<ActiveSession, 'key'>;

  constructor() {
    super('clicksDB');
    this.version(1).stores({
      clickTuples: '++id', // auto-incremented ID
      activeSession: '&key', // single active session
    });
  }
}

const db = new ClickContextTrackerDB();

export { db };
export type { ClickType, Click, ClickTuple };
