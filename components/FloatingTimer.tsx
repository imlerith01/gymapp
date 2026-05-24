import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTimer, timerStore } from '../store/timerStore';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

export default function FloatingTimer() {
  const state = useTimer();
  const [remaining, setRemaining] = useState(state.totalSeconds);
  const [expanded, setExpanded] = useState(false);
  const completedRef = useRef(false);
  const translateY = useRef(new Animated.Value(200)).current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!state.isActive) {
      Animated.timing(translateY, {
        toValue: 200,
        duration: 240,
        useNativeDriver: true,
      }).start();
      setExpanded(false);
      return;
    }

    completedRef.current = false;
    activateKeepAwakeAsync('rest-timer');

    Animated.spring(translateY, {
      toValue: 0,
      tension: 70,
      friction: 11,
      useNativeDriver: true,
    }).start();

    function tick() {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((state.endTime - now) / 1000));
      setRemaining(left);
      const fraction = state.totalSeconds > 0 ? left / state.totalSeconds : 0;
      progress.setValue(fraction);

      if (left <= 0 && !completedRef.current) {
        completedRef.current = true;
        playBeep();
        timerStore.complete();
      }
    }

    tick();
    const interval = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      deactivateKeepAwake('rest-timer');
    };
  }, [state.isActive, state.endTime]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const fraction = state.totalSeconds > 0 ? remaining / state.totalSeconds : 0;

  const ringRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <>
      <Animated.View
        style={[styles.container, { transform: [{ translateY }] }]}
        pointerEvents={state.isActive ? 'box-none' : 'none'}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setExpanded(true)}
          style={[styles.bar, SHADOWS.soft]}
        >
          <View style={[styles.progressBg, { width: `${fraction * 100}%` }]} />
          <View style={styles.content}>
            <View style={styles.timeWrap}>
              <Text style={styles.label}>PAUZA</Text>
              {state.label ? (
                <Text style={styles.contextLabel} numberOfLines={1}>
                  {state.label}
                </Text>
              ) : null}
              <Text style={styles.time}>{timeStr}</Text>
            </View>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                timerStore.skip();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.skipText}>Přeskočit</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={expanded && state.isActive}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.overlay}>
          <Text style={styles.overlayLabel}>ODPOČINEK</Text>
          {state.label ? (
            <Text style={styles.overlayContext} numberOfLines={2}>
              {state.label}
            </Text>
          ) : null}

          <View style={styles.timerCircleWrap}>
            <Animated.View
              style={[
                styles.outerRing,
                {
                  borderColor: progress.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: ['rgba(239, 68, 68, 0.6)', COLORS.accent, COLORS.accent],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[styles.rotatingDot, { transform: [{ rotate: ringRotation }] }]}
            >
              <View style={styles.dot} />
            </Animated.View>
            <View style={styles.innerCircle}>
              <Text style={styles.bigTime}>{timeStr}</Text>
              <Text style={styles.bigSecondsLeft}>{remaining}s</Text>
            </View>
          </View>

          <View style={styles.overlayButtons}>
            <TouchableOpacity
              style={styles.minimizeBtn}
              onPress={() => setExpanded(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.minimizeText}>Minimalizovat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overlaySkipBtn}
              onPress={() => {
                setExpanded(false);
                timerStore.skip();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.overlaySkipText}>Přeskočit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

async function playBeep() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
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

const RING_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    paddingTop: 8,
    zIndex: 1000,
    elevation: 1000,
  },
  bar: {
    backgroundColor: '#1A1A24',
    borderWidth: 1,
    borderColor: 'rgba(232, 168, 56, 0.25)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  progressBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: COLORS.accentSoft,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  timeWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginRight: 10,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
  },
  contextLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 0,
  },
  time: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  skipBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  skipText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Expanded overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 10, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  overlayLabel: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    fontSize: 14,
    letterSpacing: 4,
  },
  overlayContext: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -12,
  },
  timerCircleWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  outerRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 4,
  },
  rotatingDot: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
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
    width: RING_SIZE - 24,
    height: RING_SIZE - 24,
    borderRadius: (RING_SIZE - 24) / 2,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTime: {
    ...FONTS.mono,
  },
  bigSecondsLeft: {
    color: COLORS.textTertiary,
    fontSize: 14,
    marginTop: 4,
  },
  overlayButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  minimizeBtn: {
    backgroundColor: COLORS.glass,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  minimizeText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  overlaySkipBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  overlaySkipText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
});
