import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '../constants/theme';

type Props = {
  height?: number;
  width?: number | string;
  radius?: number;
  style?: ViewStyle;
};

export function SkeletonBlock({ height = 16, width = '100%', radius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { height, width: width as ViewStyle['width'], borderRadius: radius, backgroundColor: COLORS.glass, opacity },
        style,
      ]}
    />
  );
}

export function WorkoutCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonBlock width={120} height={20} radius={6} />
        <SkeletonBlock width={32} height={32} radius={16} />
      </View>
      <View style={{ gap: 10, marginTop: 6 }}>
        <SkeletonBlock width="90%" height={14} />
        <SkeletonBlock width="75%" height={14} />
        <SkeletonBlock width="85%" height={14} />
        <SkeletonBlock width="60%" height={14} />
      </View>
    </View>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <SkeletonBlock width={32} height={32} radius={10} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock width="70%" height={18} />
          <SkeletonBlock width="50%" height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
