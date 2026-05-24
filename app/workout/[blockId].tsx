import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchWorkoutData, WorkoutBlock } from '../../services/sheetsParser';
import { useTimer } from '../../store/timerStore';
import { COLORS, TYPE_COLORS, glassCard, SHADOWS, FONTS } from '../../constants/theme';

export default function WorkoutScreen() {
  const { blockId } = useLocalSearchParams<{ blockId: string }>();
  const [block, setBlock] = useState<WorkoutBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const timer = useTimer();

  useEffect(() => {
    fetchWorkoutData()
      .then((blocks) => setBlock(blocks.find((b) => b.id === blockId) || null))
      .finally(() => setLoading(false));
  }, [blockId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator size="large" color={COLORS.accent} />
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
            <View style={[styles.headerBadge, { backgroundColor: typeInfo.glow, borderColor: typeInfo.color }]}>
              <Text style={[styles.headerBadgeText, { color: typeInfo.color }]}>
                {block.type}
              </Text>
            </View>
            <Text style={styles.headerCount}>
              {block.exercises.length} cviků
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.card, SHADOWS.soft]}
            onPress={() => router.push(`/exercise/${blockId}/${item.id}`)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.04)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardTop}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
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
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
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
  },
  card: {
    ...glassCard,
    marginBottom: 12,
    overflow: 'hidden',
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
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
