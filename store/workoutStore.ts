import AsyncStorage from '@react-native-async-storage/async-storage';

export type SetLog = {
  weight: string;
  reps: string;
  completedAt: string;
};

export type ExerciseLog = {
  exerciseId: string;
  sets: SetLog[];
};

function getKey(blockId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `workout_log_${blockId}_${date}`;
}

export async function saveSet(
  blockId: string,
  exerciseId: string,
  set: SetLog
): Promise<void> {
  const key = getKey(blockId);
  const raw = await AsyncStorage.getItem(key);
  const log: Record<string, ExerciseLog> = raw ? JSON.parse(raw) : {};

  if (!log[exerciseId]) {
    log[exerciseId] = { exerciseId, sets: [] };
  }
  log[exerciseId].sets.push(set);

  await AsyncStorage.setItem(key, JSON.stringify(log));
}

export async function updateSet(
  blockId: string,
  exerciseId: string,
  index: number,
  set: SetLog
): Promise<void> {
  const key = getKey(blockId);
  const raw = await AsyncStorage.getItem(key);
  const log: Record<string, ExerciseLog> = raw ? JSON.parse(raw) : {};

  if (!log[exerciseId] || !log[exerciseId].sets[index]) return;
  log[exerciseId].sets[index] = set;

  await AsyncStorage.setItem(key, JSON.stringify(log));
}

export async function getLog(
  blockId: string
): Promise<Record<string, ExerciseLog>> {
  const key = getKey(blockId);
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : {};
}

export async function clearLog(blockId: string): Promise<void> {
  const key = getKey(blockId);
  await AsyncStorage.removeItem(key);
}
