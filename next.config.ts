import { type SentryBuildOptions, withSentryConfig } from '@sentry/nextjs';

import type { NextConfig } from 'next/dist/types';

const appVersion = process.env.APP_VERSION;

const isPreviewBuild = !!(process.env.AWS_APP_ID || process.env.AWS_AMPLIFY_BUILD);

const SentryOptions: SentryBuildOptions = {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PRJ,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  release: {
    name: appVersion,
  },
};

const config = {
  env: {
    APP_BUILD_TIME: new Date().toISOString(),
  },
  productionBrowserSourceMaps: !isPreviewBuild,
  experimental: {
    viewTransition: true,
    turbopackFileSystemCacheForDev: true,
    serverSourceMaps: !isPreviewBuild,
  },
  reactCompiler: true,
  turbopack: {
    rules: {
      '*.groq': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
      '*.vert': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
      '*.frag': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
      '*.md': {
        // Allow importing markdown files as plain text (used by import guide registry).
        loaders: ['raw-loader'],
        as: '*.js',
      },
      mp4: {
        loaders: ['file-loader'],
        as: 'asset',
      },
      pdf: {
        loaders: ['file-loader'],
        as: 'asset',
      },
    },

    // This is required by react-pdf module. See https://www.npmjs.com/package/react-pdf
    resolveAlias: {
      canvas: './empty-module.ts',
    },
  },
  devIndicators: process.env.NEXT_PUBLIC_NEXT_DEVTOOLS_POSITION
    ? {
        position:
          (process.env.NEXT_PUBLIC_NEXT_DEVTOOLS_POSITION as Exclude<
            NextConfig['devIndicators'],
            false | undefined
          >['position']) ?? 'top-right',
      }
    : false,
  reactStrictMode: true,
  compress: false,
  output: 'standalone',
  serverExternalPackages: [
    '@sentry/nextjs',
    '@opentelemetry/instrumentation',
    'require-in-the-middle',
  ],
  transpilePackages: ['jotai-devtools'],
  typescript: {
    ignoreBuildErrors: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  images: {
    loader: 'default',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'staging.openbraininstitute.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'openbluebrain.s3.us-west-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/resources',
        destination: '/notebooks',
        permanent: false,
      },
      {
        source: '/app/virtual-lab',
        destination: `/app/virtual-lab/sync`,
        permanent: false,
      },
      {
        source: '/app/virtual-lab/lab/:path*',
        destination: `/app/virtual-lab/sync`,
        permanent: false,
      },
      {
        source: '/app/virtual-lab/:vlabId/:projectId/notebooks',
        destination: '/app/virtual-lab/:vlabId/:projectId/notebooks/public',
        permanent: false,
      },
      {
        source: '/app/virtual-lab/:vlabId/:projectId/data/view/:type/:id',
        destination: '/app/virtual-lab/:vlabId/:projectId/data/view/:type/:id/overview',
        permanent: false,
      },
      {
        source: '/static/coming-soon/index.html',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default function generateConfig() {
  /*
    The build with Sentry/sourcemaps is hitting 220 MB limit in AWS Amplify,
    see https://docs.aws.amazon.com/amplify/latest/userguide/troubleshooting-SSR.html#build-output-too-large.

    TODO: Enable Sentry once there is a solution.
  */
  return isPreviewBuild ? config : withSentryConfig(config, SentryOptions);
}
