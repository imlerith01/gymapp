import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { fetchWorkoutData, WorkoutBlock } from '../services/sheetsParser';
import { useTimer } from '../store/timerStore';
import { COLORS, TYPE_COLORS, glassCard, SHADOWS, FONTS } from '../constants/theme';

export default function HomeScreen() {
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const timer = useTimer();

  async function load() {
    try {
      const data = await fetchWorkoutData();
      setBlocks(data);
    } catch (e) {
      console.error('Failed to fetch workout data:', e);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Načítání tréninku...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Obnovit</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={blocks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          timer.isActive && { paddingBottom: 130 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heroTitle}>Trénink</Text>
            <Text style={styles.heroSubtitle}>{blocks.length} bloků</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
            progressBackgroundColor={COLORS.surface}
          />
        }
        renderItem={({ item, index }) => {
          const typeInfo = TYPE_COLORS[item.type] || TYPE_COLORS.VOLUME;
          const isFirst = index === 0;

          return (
            <TouchableOpacity
              style={[styles.card, SHADOWS.soft, isFirst && { borderColor: typeInfo.color, borderWidth: 1 }]}
              onPress={() => router.push(`/workout/${item.id}`)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[
                  isFirst ? typeInfo.glow : 'rgba(255,255,255,0.03)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <View style={[styles.typeDot, { backgroundColor: typeInfo.color }]} />
                    <Text style={[styles.cardTitle, { color: typeInfo.color }]}>
                      {item.type} {item.index}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: typeInfo.glow, borderColor: typeInfo.color }]}>
                    <Text style={[styles.badgeText, { color: typeInfo.color }]}>
                      {item.exercises.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.exerciseList}>
                  {item.exercises.slice(0, 4).map((ex, i) => (
                    <View key={ex.id} style={styles.exerciseRow}>
                      <Text style={styles.exerciseNum}>{i + 1}</Text>
                      <Text style={styles.exerciseName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={styles.exerciseMeta}>
                        {ex.sets}×{ex.reps}
                      </Text>
                    </View>
                  ))}
                  {item.exercises.length > 4 && (
                    <Text style={styles.moreText}>
                      +{item.exercises.length - 4} dalších
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Žádné tréninky</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Zkusit znovu</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 15,
  },
  refreshBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(232, 168, 56, 0.2)',
  },
  refreshText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroTitle: {
    ...FONTS.title,
    fontSize: 34,
    marginBottom: 4,
  },
  heroSubtitle: {
    ...FONTS.body,
    color: COLORS.textTertiary,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    ...glassCard,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 18,
    borderRadius: 19,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  exerciseNum: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    width: 18,
  },
  exerciseName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  exerciseMeta: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  moreText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    paddingLeft: 28,
    paddingTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 20,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
