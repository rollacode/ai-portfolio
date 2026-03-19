import type { AnalyticsProvider, AnalyticsEvent } from './types';

export class ConsoleProvider implements AnalyticsProvider {
  track(event: AnalyticsEvent): void {
    console.log(
      `%c[analytics] %c${event.name}`,
      'color: #84cc16; font-weight: bold',
      'color: inherit; font-weight: normal',
      event.properties ?? '',
    );
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    console.log(
      `%c[analytics] %cidentify`,
      'color: #84cc16; font-weight: bold',
      'color: inherit; font-weight: normal',
      { userId, ...traits },
    );
  }
}
