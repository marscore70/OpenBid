/**
 * The backend is authoritative for `endsAt` (see `backend/server.js`'s
 * `applySnipeExtension`, which stacks +15s on accepted bids in the closing
 * window). `resolveDisplayEndsAt` is a defensive `Math.max` so a stored
 * display timing can never regress below the current server value; in
 * normal operation `clientDisplayEndsAt` already tracks `serverEndsAt`
 * exactly, so this is a no-op most of the time.
 */
export function resolveDisplayEndsAt(
  serverEndsAt: number,
  clientDisplayEndsAt: number | undefined,
): number {
  if (clientDisplayEndsAt === undefined) {
    return serverEndsAt;
  }
  return Math.max(serverEndsAt, clientDisplayEndsAt);
}
