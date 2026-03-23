import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  enabled: !!process.env.SENTRY_DSN,

  // Scrub sensitive fields from error payloads before they leave the server
  beforeSend(event) {
    if (event.request?.data) {
      event.request.data = scrubSensitiveFields(event.request.data);
    }
    return event;
  },
});

function scrubSensitiveFields(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data;
  const obj = data as Record<string, unknown>;
  const scrubbed = { ...obj };
  const sensitiveKeys = ['password', 'token', 'personalCode', 'base64Data', 'inviteToken'];
  for (const key of sensitiveKeys) {
    if (key in scrubbed) scrubbed[key] = '[redacted]';
  }
  return scrubbed;
}
