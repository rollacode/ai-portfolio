import type { AnalyticsProvider, AnalyticsEvent } from './types';

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '';
const AMPLITUDE_ENDPOINT = 'https://api2.amplitude.com/2/httpapi';

export class AmplitudeProvider implements AnalyticsProvider {
  private userId: string | undefined;
  private deviceId: string;
  private queue: object[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.deviceId = this.getDeviceId();
  }

  track(event: AnalyticsEvent): void {
    this.queue.push({
      event_type: event.name,
      user_id: this.userId,
      device_id: this.deviceId,
      event_properties: event.properties ?? {},
      time: Date.now(),
      platform: 'Web',
      language: navigator.language,
    });
    this.scheduleFlush();
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    this.userId = userId;
    if (traits) {
      this.queue.push({
        event_type: '$identify',
        user_id: userId,
        device_id: this.deviceId,
        user_properties: { $set: traits },
        time: Date.now(),
        platform: 'Web',
      });
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.flush();
      this.timer = null;
    }, 1000);
  }

  private flush(): void {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0);

    const body = JSON.stringify({
      api_key: AMPLITUDE_API_KEY,
      events,
    });

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(AMPLITUDE_ENDPOINT, body);
    } else {
      fetch(AMPLITUDE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  private getDeviceId(): string {
    const key = 'amp_device_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  }
}
