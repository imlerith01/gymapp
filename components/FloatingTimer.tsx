import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Animated,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTimer, timerStore } from '../store/timerStore';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

export default function FloatingTimer() {
  const state = useTimer();
  const [remaining, setRemaining] = useState(state.totalSeconds);
  const completedRef = useRef(false);
  const translateY = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    if (!state.isActive) {
      Animated.timing(translateY, {
        toValue: 200,
        duration: 240,
        useNativeDriver: true,
      }).start();
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
      const left = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
      setRemaining(left);
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

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      pointerEvents={state.isActive ? 'box-none' : 'none'}
    >
      <View style={[styles.bar, SHADOWS.soft]}>
        <View style={[styles.progress, { width: `${fraction * 100}%` }]} />
        <View style={styles.content}>
          <View style={styles.timeWrap}>
            <Text style={styles.label}>PAUZA</Text>
            <Text style={styles.time}>{timeStr}</Text>
          </View>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => timerStore.skip()}
            activeOpacity={0.8}
          >
            <Text style={styles.skipText}>Přeskočit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
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
  progress: {
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
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 14,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
  },
  time: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  skipBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 16,
  },
  skipText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
