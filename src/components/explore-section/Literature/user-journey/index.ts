import { db, ClickTuple, ClickType } from '@/components/explore-section/Literature/user-journey/db';

class ClickContextTracker {
  constructor(private dbInstance = db) {}

  async saveTuple(): Promise<void> {
    const currentTuple = await this.getCurrentTuple();
    if (!currentTuple) return;

    await this.dbInstance.clickTuples.add(currentTuple);
    await this.dbInstance.activeSession.delete('current');
  }

  async getCurrentTuple(): Promise<ClickTuple | null> {
    const session = await this.dbInstance.activeSession.get('current');
    return session ? session.value : null;
  }

  async updateCurrentTuple(tuple: ClickTuple): Promise<void> {
    await this.dbInstance.activeSession.put({ key: 'current', value: tuple });
  }

  async handleBrainRegionClick(data: string): Promise<void> {
    await this.saveTuple();

    const newTuple: ClickTuple = {
      clicks: [{ type: 'brain_region', data, timestamp: Date.now() }],
    };

    await this.updateCurrentTuple(newTuple);
  }

  async handleClick(type: ClickType, data: string): Promise<void> {
    const currentTuple = await this.getCurrentTuple();
    if (!currentTuple) {
      // eslint-disable-next-line no-console
      console.warn(`${type} clicked without a starting brain region.`);
      return;
    }

    currentTuple.clicks.push({ type, data, timestamp: Date.now() });
    await this.updateCurrentTuple(currentTuple);
  }

  async getLastTuples(count: number = 10): Promise<Array<Array<[ClickType, string]>>> {
    const tuples = await this.dbInstance.clickTuples.orderBy('id').reverse().limit(count).toArray();
    return tuples.map((tuple) => tuple.clicks.map((click) => [click.type, click.data]));
  }
}

const userJourneyTracker = new ClickContextTracker();
export { userJourneyTracker };
