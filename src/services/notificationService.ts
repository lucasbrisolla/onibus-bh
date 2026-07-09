type PermissionState = NotificationPermission | 'unsupported';

interface NotificationDeps {
  NotificationClass: typeof Notification | undefined;
}

interface ArrivalInput {
  id: string;
  lineCode: string;
  minutes: number;
  destination: string;
}

export function createNotificationService(
  deps: NotificationDeps = { NotificationClass: globalThis.Notification },
) {
  const notifiedIds = new Set<string>();

  return {
    getPermission(): PermissionState {
      return deps.NotificationClass ? deps.NotificationClass.permission : 'unsupported';
    },

    async requestPermission(): Promise<PermissionState> {
      if (!deps.NotificationClass) {
        return 'unsupported';
      }

      return deps.NotificationClass.requestPermission();
    },

    notifyArrival(input: ArrivalInput): boolean {
      if (!deps.NotificationClass || deps.NotificationClass.permission !== 'granted') {
        return false;
      }

      if (notifiedIds.has(input.id)) {
        return false;
      }

      notifiedIds.add(input.id);
      new deps.NotificationClass(`Linha ${input.lineCode} chegando`, {
        body: `Previsão de ${input.minutes} min para ${input.destination}.`,
        tag: input.id,
      });
      return true;
    },
  };
}
