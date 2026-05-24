import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchWorkoutData, Exercise } from '../../../services/sheetsParser';
import { saveSet, updateSet, getLog, SetLog } from '../../../store/workoutStore';
import { timerStore, useTimer } from '../../../store/timerStore';
import { COLORS, glassCard, SHADOWS, FONTS } from '../../../constants/theme';

export default function ExerciseScreen() {
  const { blockId, exerciseId } = useLocalSearchParams<{
    blockId: string;
    exerciseId: string;
  }>();
  const router = useRouter();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSets, setCompletedSets] = useState<SetLog[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');
  const timer = useTimer();

  useEffect(() => {
    (async () => {
      try {
        const blocks = await fetchWorkoutData();
        const block = blocks.find((b) => b.id === blockId);
        const ex = block?.exercises.find((e) => e.id === exerciseId);
        if (ex) {
          setExercise(ex);

          const initialWeights = Array.from({ length: ex.sets }, (_, i) => {
            const csvSetWeight = ex.setData[i]?.weight;
            if (csvSetWeight) return csvSetWeight;
            const w = ex.weight;
            return w && w !== 'X' ? w : '';
          });
          setWeights(initialWeights);

          const initialReps = Array.from({ length: ex.sets }, (_, i) => {
            const csvSetReps = ex.setData[i]?.reps;
            if (csvSetReps) return csvSetReps;
            return ex.reps || '';
          });
          setReps(initialReps);

          const log = await getLog(blockId!);
          if (log[exerciseId!]) {
            setCompletedSets(log[exerciseId!].sets);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [blockId, exerciseId]);

  if (loading || !exercise) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const currentSetIndex = completedSets.length;
  const allDone = currentSetIndex >= exercise.sets;
  const isEditing = editingIndex !== null;

  async function handleCompleteSet() {
    const set: SetLog = {
      weight: weights[currentSetIndex],
      reps: reps[currentSetIndex],
      completedAt: new Date().toISOString(),
    };
    await saveSet(blockId!, exerciseId!, set);
    setCompletedSets((prev) => [...prev, set]);

    if (currentSetIndex < exercise!.sets - 1) {
      const nextSetNum = currentSetIndex + 2;
      timerStore.start(
        exercise!.restSeconds,
        `${exercise!.name} · série ${nextSetNum}/${exercise!.sets}`
      );
    }
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditWeight(completedSets[index].weight);
    setEditReps(completedSets[index].reps);
  }

  function cancelEdit() {
    setEditingIndex(null);
  }

  async function saveEdit() {
    if (editingIndex === null) return;
    const updated: SetLog = {
      ...completedSets[editingIndex],
      weight: editWeight,
      reps: editReps,
    };
    await updateSet(blockId!, exerciseId!, editingIndex, updated);
    setCompletedSets((prev) => {
      const next = [...prev];
      next[editingIndex] = updated;
      return next;
    });
    setEditingIndex(null);
  }

  function handleStickyPress() {
    if (isEditing) saveEdit();
    else if (allDone) router.back();
    else handleCompleteSet();
  }

  const stickyLabel = isEditing
    ? 'Uložit změny'
    : allDone
    ? 'Cvik dokončen'
    : `Hotovo · Série ${currentSetIndex + 1}`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 100 + (timer.isActive ? 110 : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Exercise info header */}
        <View style={styles.infoHeader}>
          <View style={styles.infoChips}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Série</Text>
              <Text style={styles.chipValue}>{exercise.sets}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Opakování</Text>
              <Text style={styles.chipValue}>{exercise.reps}</Text>
            </View>
            {exercise.weight && exercise.weight !== 'X' ? (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Váha</Text>
                <Text style={styles.chipValue}>{exercise.weight}</Text>
              </View>
            ) : null}
            {exercise.tempo && exercise.tempo !== 'X' ? (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Tempo</Text>
                <Text style={styles.chipValue}>{exercise.tempo}</Text>
              </View>
            ) : null}
            {exercise.rpe ? (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>RPE</Text>
                <Text style={styles.chipValue}>{exercise.rpe}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Coach notes */}
        {exercise.coachNotes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Poznámky kouče</Text>
            <Text style={styles.notesText}>{exercise.coachNotes}</Text>
          </View>
        ) : null}

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedSets.length / exercise.sets) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedSets.length}/{exercise.sets}
          </Text>
        </View>

        {/* Sets */}
        {Array.from({ length: exercise.sets }).map((_, i) => {
          const isCompleted = i < completedSets.length;
          const isThisEditing = editingIndex === i;
          const isCurrent = i === currentSetIndex && !isEditing;
          const showInputsActive = isThisEditing || (isCurrent && !isCompleted);

          const displayWeight = isThisEditing
            ? editWeight
            : isCompleted
            ? completedSets[i].weight
            : weights[i];
          const displayReps = isThisEditing
            ? editReps
            : isCompleted
            ? completedSets[i].reps
            : reps[i];

          return (
            <View
              key={i}
              style={[
                styles.setCard,
                SHADOWS.soft,
                isCompleted && !isThisEditing && styles.setCardCompleted,
                isCurrent && styles.setCardCurrent,
                isThisEditing && styles.setCardEditing,
              ]}
            >
              <LinearGradient
                colors={[
                  isThisEditing
                    ? 'rgba(59, 130, 246, 0.10)'
                    : isCurrent
                    ? COLORS.accentSoft
                    : 'rgba(255,255,255,0.02)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.setCardInner}
              >
                <View style={styles.setHeader}>
                  <View style={styles.setNumberBadge}>
                    <Text
                      style={[
                        styles.setNumberText,
                        isCompleted && !isThisEditing && { color: COLORS.success },
                        isThisEditing && { color: COLORS.volume },
                      ]}
                    >
                      {isCompleted && !isThisEditing ? '✓' : i + 1}
                    </Text>
                  </View>
                  <Text style={styles.setLabel}>
                    {isThisEditing
                      ? 'Úprava'
                      : isCompleted
                      ? 'Hotovo'
                      : isCurrent
                      ? 'Aktuální série'
                      : `Série ${i + 1}`}
                  </Text>
                  {isCompleted && !isThisEditing ? (
                    <TouchableOpacity
                      onPress={() => startEdit(i)}
                      style={styles.editLink}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.editLinkText}>Upravit</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isThisEditing ? (
                    <TouchableOpacity
                      onPress={cancelEdit}
                      style={styles.editLink}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.cancelLinkText}>Zrušit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>KG</Text>
                    <TextInput
                      style={[
                        styles.input,
                        isCompleted && !isThisEditing && styles.inputCompleted,
                      ]}
                      value={displayWeight}
                      onChangeText={(v) => {
                        if (isThisEditing) {
                          setEditWeight(v);
                        } else if (showInputsActive) {
                          setWeights((prev) => {
                            const next = [...prev];
                            next[i] = v;
                            return next;
                          });
                        }
                      }}
                      keyboardType="numeric"
                      editable={showInputsActive}
                      placeholderTextColor={COLORS.textTertiary}
                      placeholder="0"
                    />
                  </View>
                  <Text style={styles.timesSign}>×</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>REPS</Text>
                    <TextInput
                      style={[
                        styles.input,
                        isCompleted && !isThisEditing && styles.inputCompleted,
                      ]}
                      value={displayReps}
                      onChangeText={(v) => {
                        if (isThisEditing) {
                          setEditReps(v);
                        } else if (showInputsActive) {
                          setReps((prev) => {
                            const next = [...prev];
                            next[i] = v;
                            return next;
                          });
                        }
                      }}
                      keyboardType="numeric"
                      editable={showInputsActive}
                      placeholderTextColor={COLORS.textTertiary}
                      placeholder="0"
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>

      {/* Sticky bottom action button */}
      <View
        style={[
          styles.stickyContainer,
          { bottom: timer.isActive ? 110 : 0 },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[styles.stickyButton, !isEditing && !allDone && SHADOWS.glow]}
          onPress={handleStickyPress}
          activeOpacity={0.85}
        >
          {isEditing ? (
            <View style={[styles.stickyInner, { backgroundColor: COLORS.volume }]}>
              <Text style={[styles.stickyText, { color: '#fff' }]}>{stickyLabel}</Text>
            </View>
          ) : allDone ? (
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stickyInner}
            >
              <Text style={styles.stickyText}>{stickyLabel}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.stickyInner, { backgroundColor: COLORS.accent }]}>
              <Text style={styles.stickyText}>{stickyLabel}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  scroll: {
    padding: 16,
  },
  infoHeader: {
    marginBottom: 16,
  },
  infoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipLabel: {
    ...FONTS.caption,
    fontSize: 9,
    marginBottom: 2,
  },
  chipValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  notesBox: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    paddingLeft: 14,
    paddingVertical: 12,
    paddingRight: 14,
    backgroundColor: COLORS.coachBg,
    borderRadius: 12,
    marginBottom: 20,
  },
  notesLabel: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  notesText: {
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.glass,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  setCard: {
    ...glassCard,
    marginBottom: 10,
    overflow: 'hidden',
  },
  setCardCompleted: {
    opacity: 0.55,
  },
  setCardCurrent: {
    borderColor: 'rgba(232, 168, 56, 0.3)',
  },
  setCardEditing: {
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  setCardInner: {
    padding: 16,
    borderRadius: 19,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  setNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  setLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  editLink: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  editLinkText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  cancelLinkText: {
    color: COLORS.volume,
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    ...FONTS.caption,
    fontSize: 10,
    marginBottom: 6,
    paddingLeft: 2,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  inputCompleted: {
    opacity: 0.6,
  },
  timesSign: {
    color: COLORS.textTertiary,
    fontSize: 20,
    fontWeight: '300',
    marginTop: 20,
  },
  stickyContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: 'rgba(10, 10, 15, 0.92)',
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  stickyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  stickyInner: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  stickyText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
