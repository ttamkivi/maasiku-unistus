import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sample rate in production — start at 10%
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture 10% of replays for general sessions, 100% for error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Don't send events in dev/test unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text/inputs by default — important for GDPR (student data in UI)
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Strip personal data before sending to Sentry
  // Scrub request body fields — breadcrumb scrubbing done via denyUrls/ignoreErrors
  beforeSend(event) {
    if (event.request?.data && typeof event.request.data === 'object') {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ['password', 'token', 'personalCode']) {
        if (key in data) data[key] = '[redacted]';
      }
    }
    return event;
  },
});
