import { notFound } from 'next/navigation';

import { fetchSanity } from '@/services/sanity';
import {
  isOBIShowcaseProjectProps,
  type OBIShowcaseProjectType,
} from '@/ui/segments/reports/obi-showcases/types';

import type { ServerSideComponentProp } from '@/types/common';

// Query to fetch a single public project by slug
const singleShowcaseQuery = (
  slug: string
) => `*[_type == "publicProjects" && slug.current == "${slug}"][0] {
  name,
  'slug': slug.current,
  authorsList,
  introduction,
  _updatedAt,
  'heroImage': heroImage.asset->url,
  description,
  videosList[] {
    url,
    title,
    alt,
    hasCaption,
    useTimestamps,
    'captionTrack': captionTrack.asset->url
  },
  artifactType[],
  artifact[] {
    title, 
    description,
    "file": file.asset->url,
    url,
    _type,
  },
  meModelsList[] {
    'file': file.asset->url,
    name,
    hasMorphologyThumbnail,
    "morphology": morphology.asset->url,
    hasTraceThumbnail,
    "trace": trace.asset->url,
    validated,
    brainRegion,
    species,
    mType,
    eType,
    createdBy,
    creationDate,
    morphologyId,
    traceFileId,
    url,
    _type,
  },
  minimalMeModel[] {
    name,
    brainRegion,
    mType,
    eType,
    species,
  },
  eModelsList[] {
    name,
    hasResponseThumbnail,
    'response': response.asset->url,
    brainRegion,
    mType,
    eType,
    morphologyName,
    modelCumulatedScore,
    species,
    validated,
    contributor,
    creationDate,
  },
  eModelTable[] {
    name,
    'response': response.asset -> url,
    brainRegion,
    mType,
    eType,
    morphology,
    modelCumulatedScore,
    species,
    contributors,
    creationDate,
    downloadLink,
    download
  },
  meModelTable[] {
    name,
    'morphologyThumbnail': morphologyThumbnail.asset -> url,
    'traceThumbnail': traceThumbnail.asset -> url,
    validated,
    brainRegion,
    mType,
    eType,
    species,
    createdBy,
    creationDate,
    download
  },
  notebook[] {
    name,
    description,
    objectOfInterest,
    scale,
    authors,
    creationDate,
    readMe,
    url,
  },
  synaptomeTable[] {
    name,
    description,
    MEModel,
    MType,
    EType,
    brainRegion,
    species,
    createdBy,
    creationDate,
    download,
  },
  _updatedAt,
}`;

export default async function OBIShowcasePage({
  params: promisedParams,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string; slug: string }, null>) {
  const params = await promisedParams;
  const { slug } = params;

  // Fetch the specific showcase project
  const project = await fetchSanity(
    singleShowcaseQuery(slug),
    (data: unknown): data is OBIShowcaseProjectType => {
      return isOBIShowcaseProjectProps([data]);
    }
  );

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative p-8 text-white">
          <h1 className="mb-4 text-4xl font-bold">{project.name}</h1>
          <p className="mb-6 text-xl opacity-90">{project.introduction}</p>

          {/* Authors */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium opacity-80">Authors:</span>
            {project.authorsList.map((author, index) => (
              <span key={index} className="text-sm">
                {author.firstName} {author.lastName}
                {index < project.authorsList.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {/* Description */}
          {project.description && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">Description</h2>
              <div className="prose max-w-none">
                {/* You can add PortableText rendering here if needed */}
                <p className="text-gray-700">{project.introduction}</p>
              </div>
            </div>
          )}

          {/* Videos */}
          {project.videosList && project.videosList.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">Videos</h2>
              <div className="space-y-4">
                {project.videosList.map((video, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <h3 className="mb-2 font-semibold">{video.title}</h3>
                    <video controls className="w-full rounded">
                      <source src={video.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artifacts */}
          {project.artifact && project.artifact.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-bold">Artifacts</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {project.artifact.map((artifact, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-4 transition-shadow hover:shadow-md"
                  >
                    <h3 className="mb-2 font-semibold">{artifact.title}</h3>
                    <p className="mb-3 text-sm text-gray-600">{artifact.description}</p>
                    <a
                      href={artifact.url || artifact.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Project Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Last Updated:</span>
                <span className="ml-2">{new Date(project._updatedAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Authors:</span>
                <div className="mt-1">
                  {project.authorsList.map((author, index) => (
                    <div key={index} className="text-gray-700">
                      {author.firstName} {author.lastName}
                      {author.institution && (
                        <span className="block text-xs text-gray-500">{author.institution}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <div className="space-y-2">
              <a
                href={`/app/virtual-lab/public-projects/${project.slug}`}
                className="block text-blue-600 transition-colors hover:text-blue-800"
              >
                View Full Project Details
              </a>
              <a
                href="/reports/obi-showcases"
                className="block text-blue-600 transition-colors hover:text-blue-800"
              >
                ← Back to All Showcases
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
