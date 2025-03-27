import NextBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

import { env } from './src/env.mjs';

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    /**
     * Using WebGL shaders as modules.
     */
    config.module.rules.push(
      {
        test: /\.(vert|frag|groq)$/i,
        // More information here https://webpack.js.org/guides/asset-modules/
        type: 'asset/source',
      },
      {
        test: /\.(mp4|pdf)$/i,
        // More information here https://webpack.js.org/guides/asset-modules/
        type: 'asset',
      }
    );
    return config;
  },
  env: {
    applicationVersion: getVersion(),
  },
  basePath,
  assetPrefix: basePath ?? undefined,
  reactStrictMode: true,
  swcMinify: true,
  compress: false,
  output: 'standalone',
  sentry: {
    hideSourceMaps: false,
  },
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
  transpilePackages: ['jotai-devtools'],
  logging: {
    fetches: {
      fullUrl: true,
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
    ],
  },
};

export default withSentryConfig(
  withBundleAnalyzer(withSentryConfig(nextConfig, SentryWebpackPluginOptions)),
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: 'openbraininstitute',
    project: 'core-web-app',

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: '/monitoring',

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  }
);
