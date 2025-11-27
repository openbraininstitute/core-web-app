import NextBundleAnalyzer from '@next/bundle-analyzer';
import { SentryBuildOptions, withSentryConfig } from '@sentry/nextjs';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import type { NextConfig } from 'next/dist/types';
const withBundleAnalyzer = NextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const cdnUrl = process.env.CDN_URL;
const appVersion = process.env.APP_VERSION;

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
  disableLogger: true,
  automaticVercelMonitors: false,
  release: {
    name: appVersion,
  },
};

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    env: {
      APP_BUILD_TIME: new Date().toISOString(),
    },
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
    devIndicators: process.env.NEXT_PUBLIC_NEXT_DEVTOOLS_POSITION
      ? {
          position:
            (process.env.NEXT_PUBLIC_NEXT_DEVTOOLS_POSITION as Exclude<
              NextConfig['devIndicators'],
              false | undefined
            >['position']) ?? 'top-right',
        }
      : false,
    assetPrefix: isDev || !cdnUrl ? undefined : `${cdnUrl}/${appVersion}`,
    reactStrictMode: true,
    compress: false,
    output: 'standalone',
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    transpilePackages: ['jotai-devtools'],
    logging: {
      fetches: {
        fullUrl: true,
        hmrRefreshes: true,
      },
    },
    images: {
      loader: 'default',
      path: `${cdnUri ?? ''}/_next/image`,
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
      ];
    },
    async headers() {
      if (isDev) return [];

      // Skip CORS headers if CDN URI is not configured or empty
      if (!process.env.PRIMARY_HOSTNAME) {
        // eslint-disable-next-line no-console
        console.debug('CDN URI is not configured, skipping CORS headers');
        return [];
      }

      return [
        {
          source: '/:prefix*/_next/static/media/:path*',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: `https://${process.env.PRIMARY_HOSTNAME}`,
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, HEAD, OPTIONS',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: '*',
            },
          ],
        },
      ];
    },
  };
};

export default function generateConfig(phase: string) {
  return withBundleAnalyzer(withSentryConfig(nextConfig(phase), SentryOptions));
}
