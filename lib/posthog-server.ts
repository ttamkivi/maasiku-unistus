// Server-side PostHog client for tracking events in API routes.
// Only active when NEXT_PUBLIC_POSTHOG_KEY is set.
import { PostHog } from 'posthog-node';

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      flushAt: 1,   // send immediately — serverless functions don't linger
      flushInterval: 0,
    });
  }
  return _client;
}

export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  const client = getClient();
  if (!client) return;
  client.capture({ distinctId, event, properties: properties ?? {} });
  // fire-and-forget — flushAt=1 means the event goes out immediately
  client.flush().catch(() => {});
}
