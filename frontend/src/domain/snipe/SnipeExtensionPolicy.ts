const SNIPE_THRESHOLD_MS = 10_000;
const SNIPE_EXTENSION_MS = 15_000;

export type SnipeExtensionResult = {
  displayEndsAt: number;
  extended: boolean;
};

export function applySnipeExtensionPolicy(
  serverEndsAt: number,
  bidTimestamp: number,
  previousDisplayEndsAt: number,
): SnipeExtensionResult {
  const referenceEnd = Math.max(serverEndsAt, previousDisplayEndsAt);
  const remaining = referenceEnd - bidTimestamp;
  if (remaining > 0 && remaining < SNIPE_THRESHOLD_MS) {
    return {
      displayEndsAt: referenceEnd + SNIPE_EXTENSION_MS,
      extended: true,
    };
  }
  return { displayEndsAt: referenceEnd, extended: false };
}

export function resolveDisplayEndsAt(
  serverEndsAt: number,
  clientDisplayEndsAt: number | undefined,
): number {
  if (clientDisplayEndsAt === undefined) {
    return serverEndsAt;
  }
  return Math.max(serverEndsAt, clientDisplayEndsAt);
}
