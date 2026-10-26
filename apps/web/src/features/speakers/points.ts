/** Points a speaker earns, worked out by the `speaker_points` view. Kept here for the help text. */
export const POINTS = { entry: 10, line: 1 } as const;

export type Scored = { id: string; name: string; points: number };

export type Ranked<T extends Scored> = T & { rank: number };

/**
 * Highest points first, ties by name. Tied speakers share a rank and the next one skips
 * (1, 1, 3), so a rank always says how many people are ahead.
 */
export function rankSpeakers<T extends Scored>(speakers: readonly T[]): Ranked<T>[] {
  const sorted = [...speakers].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return sorted.map((speaker) => ({
    ...speaker,
    rank: sorted.findIndex((other) => other.points === speaker.points) + 1,
  }));
}

/**
 * The speaker just above this one and how many points it takes to pass them, or null for whoever
 * is (jointly) top.
 */
export function nextToPass<T extends Scored>(
  ranked: readonly Ranked<T>[],
  id: string,
): { speaker: Ranked<T>; pointsNeeded: number } | null {
  const me = ranked.find((speaker) => speaker.id === id);
  if (!me) return null;
  const ahead = ranked.filter((speaker) => speaker.points > me.points);
  const speaker = ahead.at(-1);
  if (!speaker) return null;
  return { speaker, pointsNeeded: speaker.points - me.points + 1 };
}
