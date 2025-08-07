import NextBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

import { NextConfig } from 'next/dist/types';
import { env } from './src/env';

const withBundleAnalyzer = NextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const SentryWebpackPluginOptions = { silent: true, dryRun: !env.NEXT_PUBLIC_SENTRY_DSN };

const basePath = env.NEXT_PUBLIC_BASE_PATH;

/**
 * @returns `1.0.0` in devlopment mode, and `1.0.0 (776dc84)` after CI compiles it.
 */
function getVersion() {
  const version = env.npm_package_version;
  const commit = env.CI_COMMIT_SHORT_SHA;
  return commit ? `${version} (${commit})` : version;
}

const nextConfig: NextConfig = {
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
  env: {
    applicationVersion: getVersion(),
  },
  basePath,
  assetPrefix: basePath ?? undefined,
  reactStrictMode: true,
  compress: false,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/app/build',
        destination: '/app/build/cell-composition/interactive',
        permanent: false,
      },
      {
        source: '/app/build/connectome-definition',
        destination: '/app/build/connectome-definition/configuration',
        permanent: false,
      },
      {
        source: '/app/build/cell-model-assignment',
        destination: '/app/build/cell-model-assignment/m-model/configuration',
        permanent: false,
      },
      {
        source: '/app/experiment-designer',
        destination: '/app/experiment-designer/experiment-setup',
        permanent: false,
      },
    ];
  },
  transpilePackages: ['jotai-devtools', '@t3-oss/env-nextjs', '@t3-oss/env-core'],
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sbo-nexus-delta.shapes-registry.org',
        port: '',
        pathname: '/v1/files/**',
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
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, SentryWebpackPluginOptions));
