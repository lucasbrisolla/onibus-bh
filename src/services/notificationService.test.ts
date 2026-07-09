import { describe, expect, it, vi } from 'vitest';
import { createNotificationService } from './notificationService';

describe('createNotificationService', () => {
  it('reports unsupported browsers', () => {
    const service = createNotificationService({ NotificationClass: undefined });

    expect(service.getPermission()).toBe('unsupported');
  });

  it('does not send duplicate notifications for the same prediction', () => {
    const notificationSpy = vi.fn();

    class FakeNotification {
      static permission = 'granted';

      constructor(title: string, options?: NotificationOptions) {
        notificationSpy(title, options);
      }
    }

    const service = createNotificationService({
      NotificationClass: FakeNotification as unknown as typeof Notification,
    });

    service.notifyArrival({ id: 'a', lineCode: '8350', minutes: 5, destination: 'Centro' });
    service.notifyArrival({ id: 'a', lineCode: '8350', minutes: 5, destination: 'Centro' });

    expect(notificationSpy).toHaveBeenCalledTimes(1);
  });
});
