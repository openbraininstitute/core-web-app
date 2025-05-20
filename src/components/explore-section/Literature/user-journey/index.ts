import isNil from 'lodash/isNil';

import { db, ClickTuple, ClickType } from '@/components/explore-section/Literature/user-journey/db';
import GenericEvent from '@/util/generic-event';

const DEFAULT_COUNT = 3;

function sortTuples(tuples: ClickTuple[]) {
  return tuples.sort((a, b) => {
    const aTimestamp = a.clicks.find((c) => c.type === 'brain_region')?.timestamp || 0;
    const bTimestamp = b.clicks.find((c) => c.type === 'brain_region')?.timestamp || 0;
    return bTimestamp - aTimestamp;
  });
}

class ClickContextTracker {
  public readonly eventChange = new GenericEvent<ClickContextTracker>();

  constructor(private dbInstance = db) {}

  async saveTuple(): Promise<void> {
    const currentTuple = await this.getCurrentTuple();

    if (!currentTuple) return;

    try {
      await this.dbInstance.clickTuples.add(currentTuple);
      const allTuplesFromDB = await this.dbInstance.clickTuples.toArray();
      const sortedAllTuples = sortTuples([...allTuplesFromDB]);
      if (sortedAllTuples.length > DEFAULT_COUNT) {
        const tuplesToDelete = sortedAllTuples.slice(DEFAULT_COUNT);
        const idsToDelete = tuplesToDelete
          .map((tuple) => tuple.id)
          .filter((id): id is number => typeof id === 'number' && !isNil(id));

        if (idsToDelete.length > 0) {
          await this.dbInstance.clickTuples.bulkDelete(idsToDelete);
        }
      }

      await this.dbInstance.activeSession.delete('current');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in save user journey tuple:', error);
    }
  }

  async getCurrentTuple(): Promise<ClickTuple | null> {
    const session = await this.dbInstance.activeSession.get('current');
    return session ? session.value : null;
  }

  async updateCurrentTuple(tuple: ClickTuple): Promise<void> {
    await this.dbInstance.activeSession.put({ key: 'current', value: tuple });
    this.eventChange.dispatch(this);
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

  async getLastTuples(count: number = DEFAULT_COUNT): Promise<Array<Array<[ClickType, string]>>> {
    const tuples = await this.dbInstance.clickTuples.orderBy('id').toArray();
    const currentActiveTuple = await this.getCurrentTuple();
    const sortedClicks = sortTuples([
      ...tuples,
      ...(currentActiveTuple ? [currentActiveTuple] : []),
    ])
      .slice(0, count)
      .reverse();

    return sortedClicks.map((tuple: ClickTuple) =>
      tuple.clicks.map((click: ClickTuple['clicks'][number]) => [click.type, click.data])
    );
  }
}

const userJourneyTracker = new ClickContextTracker();
export { userJourneyTracker };
