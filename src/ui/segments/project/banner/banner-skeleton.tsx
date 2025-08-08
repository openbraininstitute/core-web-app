'use client';

export function ProjectCardSkeletonShimmer() {
  return (
    <div
      className="relative h-72 w-full overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(95.23deg, #0050B3 18.61%, #69C0FF 103.56%)',
      }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 z-30">
        <div
          className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{ animation: 'shimmer 2s infinite' }}
        />
      </div>

      {/* Edit button skeleton */}
      <div className="absolute top-6 right-6 z-20">
        <div className="h-10 w-10 rounded-full bg-white/20" />
      </div>

      {/* Image skeleton */}
      <div className="absolute top-0 right-0 z-10">
        <div className="h-auto max-w-[300px] lg:max-w-[400px] xl:max-w-[500px]">
          <div className="h-72 w-full rounded-l-2xl bg-white/10" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="relative z-10 h-full w-full">
        <div className="h-full w-full p-6 md:w-[calc(100%-6px)] md:pt-20 lg:p-6 lg:md:w-[calc(var(--container-2xl)-14px)] xl:max-w-3xl">
          {/* Title skeleton */}
          <div className="mb-6">
            <div className="h-8 w-3/4 rounded-lg bg-white/20" />
          </div>

          {/* Description skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-white/20" />
            <div className="h-4 w-5/6 rounded bg-white/20" />
            <div className="h-4 w-4/5 rounded bg-white/20" />
            <div className="h-4 w-3/4 rounded bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
