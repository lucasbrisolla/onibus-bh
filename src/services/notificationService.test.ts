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

  it('returns false and does not mark the notification as sent when Notification throws', () => {
    const notificationSpy = vi.fn();

    class ThrowingNotification {
      static permission = 'granted';

      constructor() {
        notificationSpy();
        throw new Error('permission changed');
      }
    }

    class WorkingNotification {
      static permission = 'granted';

      constructor(title: string, options?: NotificationOptions) {
        notificationSpy(title, options);
      }
    }

    const deps = {
      NotificationClass: ThrowingNotification as unknown as typeof Notification,
    };
    const service = createNotificationService(deps);

    expect(
      service.notifyArrival({ id: 'a', lineCode: '8350', minutes: 5, destination: 'Centro' }),
    ).toBe(false);

    deps.NotificationClass = WorkingNotification as unknown as typeof Notification;

    expect(
      service.notifyArrival({ id: 'a', lineCode: '8350', minutes: 5, destination: 'Centro' }),
    ).toBe(true);
    expect(notificationSpy).toHaveBeenCalledTimes(2);
  });
});
