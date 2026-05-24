import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

type State = {
  isActive: boolean;
  endTime: number;
  totalSeconds: number;
  label: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync({
      android: { allowAlert: true, allowSound: true, allowVibrate: true },
    });
    if (newStatus !== 'granted') return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest Timer',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'beep.mp3',
      vibrationPattern: [0, 400, 200, 400],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
  return true;
}

class TimerStore {
  private state: State = { isActive: false, endTime: 0, totalSeconds: 0, label: '' };
  private listeners = new Set<() => void>();
  private notificationId: string | null = null;

  getState(): State {
    return this.state;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  async start(seconds: number, label = '') {
    if (this.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(this.notificationId);
      } catch {}
      this.notificationId = null;
    }

    this.state = {
      isActive: true,
      endTime: Date.now() + seconds * 1000,
      totalSeconds: seconds,
      label,
    };
    this.emit();

    const allowed = await ensureNotificationPermissions();
    if (!allowed) return;

    try {
      this.notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pauza skončila!',
          body: 'Čas na další sérii',
          sound: Platform.OS === 'android' ? 'beep.mp3' : 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === 'android' ? { channelId: 'rest-timer' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
    } catch {
      // Notifications not available (e.g. web)
    }
  }

  async skip() {
    if (this.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(this.notificationId);
      } catch {}
      this.notificationId = null;
    }
    this.state = { isActive: false, endTime: 0, totalSeconds: 0, label: '' };
    this.emit();
  }

  // Called when the JS countdown reaches zero. The OS-scheduled
  // notification should fire at the same moment — do NOT cancel it,
  // otherwise the user gets no sound when the app is backgrounded.
  complete() {
    this.notificationId = null;
    this.state = { isActive: false, endTime: 0, totalSeconds: 0, label: '' };
    this.emit();
  }
}

export const timerStore = new TimerStore();

export function useTimer(): State {
  const [state, setState] = useState(timerStore.getState());
  useEffect(() => {
    return timerStore.subscribe(() => setState(timerStore.getState()));
  }, []);
  return state;
}
