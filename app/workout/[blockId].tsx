import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchWorkoutData, WorkoutBlock } from '../../services/sheetsParser';
import { useTimer } from '../../store/timerStore';
import { getLog, ExerciseLog } from '../../store/workoutStore';
import { ExerciseCardSkeleton } from '../../components/Skeleton';
import { COLORS, TYPE_COLORS, glassCard, SHADOWS, FONTS } from '../../constants/theme';

export default function WorkoutScreen() {
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const [block, setBlock] = useState<WorkoutBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<Record<string, ExerciseLog>>({});
  const router = useRouter();
  const timer = useTimer();

  useEffect(() => {
    fetchWorkoutData()
      .then((blocks) => setBlock(blocks.find((b) => b.id === blockId) || null))
      .finally(() => setLoading(false));
  }, [blockId]);

  // Refresh log every time the screen regains focus so completed-exercise
  // indicators stay in sync after the user returns from an exercise.
  useFocusEffect(
    useCallback(() => {
      if (!blockId) return;
      let cancelled = false;
      getLog(blockId).then((l) => {
        if (!cancelled) setLog(l);
      });
      return () => {
        cancelled = true;
      };
    }, [blockId])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '' }} />
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerBadgeSkeleton} />
              <View style={styles.headerCountSkeleton} />
            </View>
            <View style={styles.progressTrack} />
          </View>
          <ExerciseCardSkeleton />
          <ExerciseCardSkeleton />
          <ExerciseCardSkeleton />
          <ExerciseCardSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (!block) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Chyba' }} />
        <Text style={styles.errorText}>Blok nenalezen</Text>
      </View>
    );
  }

  const typeInfo = TYPE_COLORS[block.type] || TYPE_COLORS.VOLUME;
  const completedExercisesCount = block.exercises.filter((ex) => {
    const exLog = log[ex.id];
    return exLog && exLog.sets.length >= ex.sets;
  }).length;
  const allDone = completedExercisesCount === block.exercises.length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `${block.type} ${block.index}` }} />
      <FlatList
        data={block.exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          timer.isActive && { paddingBottom: 130 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={[styles.headerBadge, { backgroundColor: typeInfo.glow, borderColor: typeInfo.color }]}>
                <Text style={[styles.headerBadgeText, { color: typeInfo.color }]}>
                  {block.type}
                </Text>
              </View>
              <Text style={[styles.headerCount, allDone && { color: COLORS.success }]}>
                {completedExercisesCount} / {block.exercises.length} cviků
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(completedExercisesCount / block.exercises.length) * 100}%`,
                    backgroundColor: allDone ? COLORS.success : typeInfo.color,
                  },
                ]}
              />
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const exLog = log[item.id];
          const doneSets = exLog?.sets.length || 0;
          const isComplete = doneSets >= item.sets;
          const inProgress = doneSets > 0 && doneSets < item.sets;

          return (
            <TouchableOpacity
              style={[
                styles.card,
                SHADOWS.soft,
                isComplete && styles.cardComplete,
              ]}
              onPress={() => router.push(`/exercise/${blockId}/${item.id}`)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[
                  isComplete
                    ? 'rgba(34, 197, 94, 0.08)'
                    : inProgress
                    ? COLORS.accentSoft
                    : 'rgba(255,255,255,0.04)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.positionBadge,
                      isComplete && { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: COLORS.success },
                    ]}
                  >
                    <Text
                      style={[
                        styles.positionText,
                        isComplete && { color: COLORS.success },
                      ]}
                    >
                      {isComplete ? '✓' : index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseName, isComplete && styles.exerciseNameDone]}>
                      {item.name}
                    </Text>
                    <View style={styles.tagsRow}>
                      <View style={[styles.tag, { backgroundColor: typeInfo.glow }]}>
                        <Text style={[styles.tagText, { color: typeInfo.color }]}>{item.pattern}</Text>
                      </View>
                      <Text style={styles.metaText}>
                        {item.sets} × {item.reps}
                      </Text>
                      {item.weight && item.weight !== 'X' ? (
                        <Text style={styles.metaText}>{item.weight}</Text>
                      ) : null}
                      {inProgress ? (
                        <Text style={styles.inProgressTag}>
                          {doneSets}/{item.sets} série
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.chevron}>
                    <Text style={styles.chevronText}>›</Text>
                  </View>
                </View>

                {(item.tempo && item.tempo !== 'X') || item.rpe ? (
                  <View style={styles.detailsRow}>
                    {item.tempo && item.tempo !== 'X' ? (
                      <View style={styles.detailChip}>
                        <Text style={styles.detailLabel}>Tempo</Text>
                        <Text style={styles.detailValue}>{item.tempo}</Text>
                      </View>
                    ) : null}
                    {item.rpe ? (
                      <View style={styles.detailChip}>
                        <Text style={styles.detailLabel}>RPE</Text>
                        <Text style={styles.detailValue}>{item.rpe}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailChip}>
                      <Text style={styles.detailLabel}>Pauza</Text>
                      <Text style={styles.detailValue}>{item.restSeconds}s</Text>
                    </View>
                  </View>
                ) : null}

                {item.coachNotes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Kouč</Text>
                    <Text style={styles.notesText}>{item.coachNotes}</Text>
                  </View>
                ) : null}

                {item.athleteNotes ? (
                  <View style={styles.athleteNotesBox}>
                    <Text style={styles.athleteNotesLabel}>Já</Text>
                    <Text style={styles.athleteNotesText}>{item.athleteNotes}</Text>
                  </View>
                ) : null}
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
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
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 4,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerCount: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  headerBadgeSkeleton: {
    width: 90,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.glass,
  },
  headerCountSkeleton: {
    width: 110,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.glass,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.glass,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  card: {
    ...glassCard,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardComplete: {
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  cardGradient: {
    padding: 16,
    borderRadius: 19,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  positionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseName: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  exerciseNameDone: {
    color: COLORS.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  inProgressTag: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    marginTop: 4,
    marginLeft: 4,
  },
  chevronText: {
    color: COLORS.textTertiary,
    fontSize: 22,
    fontWeight: '300',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingLeft: 46,
  },
  detailChip: {
    backgroundColor: COLORS.glass,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  detailLabel: {
    ...FONTS.caption,
    fontSize: 9,
    marginBottom: 1,
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  notesBox: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.coachBg,
    borderRadius: 8,
    marginTop: 12,
    marginLeft: 46,
  },
  notesLabel: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  notesText: {
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
  },
  athleteNotesBox: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.volume,
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 46,
  },
  athleteNotesLabel: {
    color: COLORS.volume,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  athleteNotesText: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
  },
});
