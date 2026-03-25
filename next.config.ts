import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '.prisma-app',
    '@prisma/client',
    '@prisma/adapter-libsql',
    '@libsql/client',
    'prisma',
    '@anthropic-ai/sdk',
  ],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(self), microphone=(), geolocation=()',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://eu.i.posthog.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self' https://eu.i.posthog.com https://*.sentry.io",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ],
};

export default withSentryConfig(nextConfig, {
  // Set SENTRY_ORG and SENTRY_PROJECT in env or Vercel project settings
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress CLI output during builds unless debugging
  silent: !process.env.DEBUG_SENTRY,

  // Source map upload requires SENTRY_AUTH_TOKEN at build time
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Tree-shake Sentry debug logs from production bundle
  disableLogger: true,

  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
});
