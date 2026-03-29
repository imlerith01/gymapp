import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  AppState,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { COLORS, FONTS } from '../constants/theme';

// Show notification as alert even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Props = {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
};

async function ensureNotificationPermissions() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }

  // Android: create a high-priority channel for timer alerts
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest Timer',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
      enableVibrate: true,
    });
  }
}

export default function RestTimer({ seconds, onComplete, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const progress = useRef(new Animated.Value(1)).current;
  const endTimeRef = useRef(Date.now() + seconds * 1000);
  const completedRef = useRef(false);
  const notificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    activateKeepAwakeAsync('rest-timer');
    endTimeRef.current = Date.now() + seconds * 1000;

    // Schedule a notification for when the timer ends (works in background)
    scheduleTimerNotification(seconds);

    function tick() {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setRemaining(left);

      const fraction = left / seconds;
      progress.setValue(fraction);

      if (left <= 0 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(interval);
        // Play in-app beep as well (if app is in foreground)
        playBeep().then(onComplete);
      }
    }

    const interval = setInterval(tick, 250);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
      cancelTimerNotification();
      deactivateKeepAwake('rest-timer');
    };
  }, []);

  async function scheduleTimerNotification(secs: number) {
    try {
      await ensureNotificationPermissions();
      notificationIdRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏱️ Pauza skončila!',
          body: 'Čas na další sérii',
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'rest-timer' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secs,
        },
      });
    } catch {
      // Notifications not available (e.g. web)
    }
  }

  async function cancelTimerNotification() {
    try {
      if (notificationIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        notificationIdRef.current = null;
      }
    } catch {
      // ignore
    }
  }

  async function playBeep() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/beep.mp3')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // No beep file available
    }
  }

  function handleSkip() {
    cancelTimerNotification();
    onSkip();
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const size = 240;
  const strokeWidth = 4;

  const ringColor = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['rgba(239, 68, 68, 0.6)', COLORS.accent, COLORS.accent],
  });

  const rotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <Text style={styles.label}>ODPOČINEK</Text>

        <View style={styles.timerContainer}>
          {/* Outer glow ring */}
          <Animated.View
            style={[
              styles.outerRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: ringColor,
              },
            ]}
          />

          {/* Rotating indicator dot */}
          <Animated.View
            style={[
              styles.rotatingDot,
              {
                width: size,
                height: size,
                transform: [{ rotate: rotation }],
              },
            ]}
          >
            <View style={styles.dot} />
          </Animated.View>

          {/* Inner glass circle */}
          <View style={[styles.innerCircle, { width: size - 24, height: size - 24, borderRadius: (size - 24) / 2 }]}>
            <Text style={styles.time}>{timeStr}</Text>
            <Text style={styles.secondsLeft}>{remaining}s</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Přeskočit</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 10, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    fontSize: 14,
    letterSpacing: 4,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 4,
  },
  rotatingDot: {
    position: 'absolute',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
    marginTop: -6,
  },
  innerCircle: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    ...FONTS.mono,
  },
  secondsLeft: {
    color: COLORS.textTertiary,
    fontSize: 14,
    marginTop: 4,
  },
  skipButton: {
    backgroundColor: COLORS.glass,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  skipText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
