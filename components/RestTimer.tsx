import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { COLORS, FONTS } from '../constants/theme';

type Props = {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
};

export default function RestTimer({ seconds, onComplete, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    activateKeepAwakeAsync('rest-timer');

    Animated.timing(progress, {
      toValue: 0,
      duration: seconds * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          playBeep().then(onComplete);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      deactivateKeepAwake('rest-timer');
    };
  }, []);

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

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
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
