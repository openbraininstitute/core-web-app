import { SentryBuildOptions, withSentryConfig } from '@sentry/nextjs';
import NextBundleAnalyzer from '@next/bundle-analyzer';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import type { NextConfig } from 'next/dist/types';
import { env } from './src/env';

const withBundleAnalyzer = NextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const basePath = env.NEXT_PUBLIC_BASE_PATH;
const cdnUri = env.NEXT_PUBLIC_CDN_URI || process.env.NEXT_PUBLIC_CDN_URI;
const coreWebAppVersion = env.NEXT_PUBLIC_CORE_WEB_APP_VERSION;

const SentryOptions: SentryBuildOptions = {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: env.NEXT_PUBLIC_SENTRY_ORG,
  project: env.NEXT_PUBLIC_SENTRY_PRJ,

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
    name: coreWebAppVersion,
  },
};

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
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
    basePath,
    devIndicators: process.env.NEXT_PUBLIC_NEXT_DEVTOOLS_POSITION
      ? {
          position:
            (process.env.NEXT_PUBLIC_NEXT_DEVTOOLS_POSITION as Exclude<
              NextConfig['devIndicators'],
              false | undefined
            >['position']) ?? 'top-right',
        }
      : false,
    assetPrefix: isDev || !cdnUri ? undefined : `${cdnUri}/${coreWebAppVersion}`,
    reactStrictMode: true,
    compress: false,
    output: 'standalone',
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    transpilePackages: ['jotai-devtools', '@t3-oss/env-nextjs', '@t3-oss/env-core'],
    logging: {
      fetches: {
        fullUrl: true,
        hmrRefreshes: true,
      },
    },
    productionBrowserSourceMaps: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'development',
    images: {
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
