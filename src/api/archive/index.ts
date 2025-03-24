import FileSaver from 'file-saver';
import { Session } from 'next-auth';

import { postNexusArchive } from './post-archive';
import { EntityResource, Distribution } from '@/types/nexus/common';
import { fetchFileMetadataByUrl, fetchResourceByUrl } from '@/api/nexus';
import { ensureArray } from '@/util/nexus';
import authFetch from '@/authFetch';

interface ResourceWithDistribution extends EntityResource {
  distribution: Distribution | Distribution[];
}

/** Fetch the file metadata for all distributions associated with a given Nexus resource. */
async function fetchDistribution(selfId: string, session: Session) {
  return fetchResourceByUrl<ResourceWithDistribution>(selfId, session).then((resource) =>
    Promise.all(
      ensureArray(resource.distribution).map((distribution) =>
        fetchFileMetadataByUrl(distribution.contentUrl, session)
      )
    )
  );
}

/** Create and download a Nexus archive for the provided resource IDs, and trigger a callback, if one is provided. */
export default async function fetchArchive(
  resourceIds: string[],
  session: Session,
  successCallback: () => void,
  errorCallback: () => void
) {
  if (!session) return null;

  return Promise.all(resourceIds.map((selfId) => fetchDistribution(selfId, session)))
    .then((responses) => responses.flat())
    .then((resources) => postNexusArchive(resources, session))
    .then(async (response) => {
      if (!response) {
        throw Error('Error fetching archive');
      }
      const fileRes = await authFetch(response, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return fileRes.blob();
    })
    .then(FileSaver.saveAs)
    .then(successCallback)
    .catch(errorCallback);
}
