/**
 * Tracks the latest in-flight request generation per key so a fetch whose
 * response arrives after a newer request for the same key can detect that
 * it has been superseded and skip committing stale data (fixes SSE-vs-refetch
 * and refetch-vs-refetch last-write-wins races).
 */
export type RequestGenerationGuard<Key> = Readonly<{
  /** Starts a new request for `key` and returns its generation number. */
  next: (key: Key) => number;
  /** True when `generation` is still the most recent one started for `key`. */
  isLatest: (key: Key, generation: number) => boolean;
}>;

export function createRequestGenerationGuard<
  Key,
>(): RequestGenerationGuard<Key> {
  const latestGenerationByKey = new Map<Key, number>();

  return {
    next: (key) => {
      const generation = (latestGenerationByKey.get(key) ?? 0) + 1;
      latestGenerationByKey.set(key, generation);
      return generation;
    },
    isLatest: (key, generation) => latestGenerationByKey.get(key) === generation,
  };
}
