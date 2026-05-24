import Papa from 'papaparse';

const SHEETS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaRDPANsAOFHzP5qFERFwbXGSxUf2aztMHf0yGYqX4mSkh4Lfse2PnGIgp836panK_GtNsHinHcYpg/pub?gid=0&single=true&output=csv';

export type WorkoutBlock = {
  id: string;
  type: 'VOLUME' | 'STRENGHT' | 'DELOAD';
  index: number;
  exercises: Exercise[];
};

export type SetData = {
  weight: string;
  reps: string;
};

export type Exercise = {
  id: string;
  position: number;
  name: string;
  pattern: string;
  sets: number;
  reps: string;
  restSeconds: number;
  weight: string;
  tempo: string;
  rpe: string;
  coachNotes: string;
  setData: SetData[];
  athleteNotes: string;
};

const BLOCK_KEYWORDS = ['VOLUME', 'STRENGHT', 'DELOAD'] as const;
type BlockType = (typeof BLOCK_KEYWORDS)[number];

function cellsToCheck(row: string[]): string[] {
  // Spreadsheet may place keywords in column A (0) or column B (1)
  return [0, 1].map((i) => (row[i] || '').trim().toUpperCase());
}

function detectBlockType(row: string[]): BlockType | null {
  for (const cell of cellsToCheck(row)) {
    for (const keyword of BLOCK_KEYWORDS) {
      if (cell === keyword) return keyword;
    }
  }
  return null;
}

function isBlockSeparator(row: string[]): boolean {
  for (const cell of cellsToCheck(row)) {
    if (BLOCK_KEYWORDS.some((k) => cell === k)) return true;
    if (cell === '-') return true;
  }
  return false;
}

function isColumnHeader(row: string[]): boolean {
  return cellsToCheck(row).some((c) => c === 'MOVEMENT');
}

function parseRestTime(value: string): number {
  if (!value || value.trim().toUpperCase() === 'X' || value.trim() === '') return 90;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 90;
}

function parseSetData(row: string[], numSets: number): SetData[] {
  // Set weights/reps start at col 12, repeating every 3 cols (weight, reps, separator)
  const sets: SetData[] = [];
  for (let s = 0; s < Math.min(numSets, 6); s++) {
    const baseCol = 12 + s * 3;
    sets.push({
      weight: (row[baseCol] || '').trim(),
      reps: (row[baseCol + 1] || '').trim(),
    });
  }
  return sets;
}

export async function fetchWorkoutData(): Promise<WorkoutBlock[]> {
  const response = await fetch(SHEETS_URL);
  const csv = await response.text();

  const parsed = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: false });
  const rows = parsed.data;

  const blocks: WorkoutBlock[] = [];
  const typeCounters: Record<string, number> = {};

  let i = 9;

  while (i < rows.length) {
    if (!isBlockSeparator(rows[i])) {
      i++;
      continue;
    }

    let blockType = detectBlockType(rows[i]);
    if (!blockType) blockType = 'STRENGHT';

    typeCounters[blockType] = (typeCounters[blockType] || 0) + 1;
    const blockIndex = typeCounters[blockType];
    const blockId = `${blockType}_${blockIndex}`;

    i++;
    if (i < rows.length && isColumnHeader(rows[i])) i++;

    const exercises: Exercise[] = [];
    let position = 1;

    while (i < rows.length) {
      const row = rows[i];
      if (isBlockSeparator(row)) break;

      const name = (row[2] || '').trim();
      if (!name) { i++; continue; }

      const sets = parseInt((row[4] || '').trim(), 10);
      if (isNaN(sets) || sets <= 0) { i++; continue; }

      exercises.push({
        id: `${blockId}_ex${position}`,
        position,
        name,
        pattern: (row[3] || '').trim(),
        sets,
        reps: (row[5] || '').trim(),
        restSeconds: parseRestTime((row[6] || '').trim()),
        weight: (row[7] || '').trim(),
        tempo: (row[8] || '').trim(),
        rpe: (row[9] || '').trim(),
        coachNotes: (row[10] || '').trim(),
        setData: parseSetData(row, sets),
        athleteNotes: (row[30] || '').trim(),
      });

      position++;
      i++;
    }

    if (exercises.length > 0) {
      blocks.push({ id: blockId, type: blockType, index: blockIndex, exercises });
    }
  }

  // Reverse so newest workout (last in spreadsheet) appears first
  return blocks.reverse();
}
