import type { AnalyticsProvider, AnalyticsEvent } from './types';

let provider: AnalyticsProvider | null = null;

function getProvider(): AnalyticsProvider {
  if (provider) return provider;

  const isDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  if (isDev) {
    const { ConsoleProvider } = require('./console-provider');
    provider = new ConsoleProvider();
  } else {
    const { AmplitudeProvider } = require('./amplitude-provider');
    provider = new AmplitudeProvider();
  }

  return provider!;
}

export function track(name: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  getProvider().track({ name, properties });
}

export function identify(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  getProvider().identify(userId, traits);
}

export type { AnalyticsProvider, AnalyticsEvent };
