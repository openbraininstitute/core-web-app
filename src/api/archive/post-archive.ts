'use server';

import { Session } from 'next-auth';
import uniqBy from 'lodash/uniqBy';

import { FileMetadata } from '@/types/nexus/common';
import { createHeaders } from '@/util/utils';
import { nexus } from '@/config';

/** Ensure usable filename length, and override default archive file structure. */
function formatArchiveResource(resource: FileMetadata) {
  const orgProject = new URL(resource._project).pathname.split('/');
  const [org, project] = orgProject.slice(Math.max(orgProject.length - 2, 1));
  const getFileExt = /(?:\.([^.]+))?$/;
  const filename = resource._filename;
  const ext = filename && getFileExt.exec(filename)?.[1];
  const shortFilename = ext && filename.length > 99 && filename.substring(0, 98 - ext.length) + ext;

  return {
    '@type': resource['@type'],
    project: `${org}/${project}`,
    resourceId: resource['@id'],
    path: `/${shortFilename || filename}`,
  };
}

/** Create and return a TAR file containing the provided resources. */
export async function postNexusArchive(resources: FileMetadata[], session: Session) {
  const archiveRes = await fetch(
    `${nexus.url}/archives/${nexus.org}/${nexus.project}/`, // Can be any org/project combo (will be overridden by project property of resource)
    {
      method: 'POST',
      headers: createHeaders(session.accessToken, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        // resources array should have unique 'path' field (Nexus limitation)
        resources: uniqBy(resources.map(formatArchiveResource), 'path'),
      }),
      redirect: 'manual',
    }
  );

  return archiveRes.headers.get('Location');
}
