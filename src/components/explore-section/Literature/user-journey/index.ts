'use client';

import GenericEvent from '@/util/generic-event';
import { logError } from '@/util/logger';
import { getLocalStorageHelper } from '@/util/storage';
import { assertType } from '@/util/type-guards';

const MAX_COUNT = 3;

type UserJourneyItem = {
  timestamp: number;
  region: string;
  artifact: string | null;
};
type UserJourney = UserJourneyItem[];

function assertUserJourney(data: unknown): asserts data is UserJourney {
  assertType(data, [
    'array',
    {
      timestamp: 'number',
      region: 'string',
      artifact: ['|', 'string', 'null'],
    },
  ]);
}

function isUserJourney(data: unknown): data is UserJourney {
  try {
    assertUserJourney(data);
    return true;
  } catch {
    logError('Invalid format for UserJourney:', data);
    return false;
  }
}

class UserJourneyTracker {
  public readonly eventChange = new GenericEvent<UserJourney>();

  private readonly KEY = 'UserJourney';

  private readonly history: UserJourney;

  private lastRegion = '';

  private lastArtifact: string | null = null;

  constructor() {
    try {
      this.history = getLocalStorageHelper().get(
        this.KEY,
        [
          {
            timestamp: Date.now(),
            region: 'Cerebrum',
            artifact: null,
          },
        ],
        isUserJourney
      );
      if (this.trim()) this.save();
    } catch (ex) {
      logError('Bad format for UserJourney in local storage:', ex);
      this.history = [];
      this.save();
    }
    const lastItem = this.history.at(-1);
    if (lastItem) {
      const { region, artifact } = lastItem;
      this.lastRegion = region;
      this.lastArtifact = artifact;
    }
  }

  /**
   * A copy of the current user journey
   */
  get value() {
    return structuredClone(this.history);
  }

  registerBrainRegionClick(brainRegionName: string) {
    if (brainRegionName === this.lastRegion) return;

    this.lastRegion = brainRegionName;
    this.pushItem();
  }

  registerArtifactClick(artifactName: string) {
    if (artifactName === this.lastArtifact) return;

    this.lastArtifact = artifactName;
    this.pushItem();
  }

  private pushItem() {
    const item: UserJourneyItem = {
      timestamp: Date.now(),
      region: this.lastRegion,
      artifact: this.lastArtifact,
    };
    this.history.push(item);
    this.trim();
    this.save();
    this.eventChange.dispatch(this.value);
  }

  private trim() {
    if (this.history.length > MAX_COUNT) {
      // Keep only the MAX_COUNT last ones
      this.history.splice(0, this.history.length - MAX_COUNT);
      return true;
    }
    return false;
  }

  private save() {
    getLocalStorageHelper().set(this.KEY, this.history);
  }
}

const userJourneyTracker = new UserJourneyTracker();
export { userJourneyTracker };
