import * as amplitude from '@amplitude/analytics-browser';
import type { AnalyticsProvider, AnalyticsEvent } from './types';

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '';

let initialized = false;

function init() {
  if (initialized || !API_KEY) return;
  amplitude.init(API_KEY, { autocapture: false });
  initialized = true;
}

export class AmplitudeProvider implements AnalyticsProvider {
  constructor() {
    init();
  }

  track(event: AnalyticsEvent): void {
    amplitude.track(event.name, event.properties);
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    amplitude.setUserId(userId);
    if (traits) {
      const identifyObj = new amplitude.Identify();
      for (const [key, value] of Object.entries(traits)) {
        identifyObj.set(key, value as string);
      }
      amplitude.identify(identifyObj);
    }
  }
}
