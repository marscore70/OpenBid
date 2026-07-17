import { useEffect, useState } from 'react';
import { computeTimeRemaining } from '../../domain/auction/computeTimeRemaining';
import { resolveDisplayEndsAt } from '../../domain/snipe/SnipeExtensionPolicy';
import { AuctionStatus } from '../../shared/types/AuctionStatus';

export function useCountdownTick(serverEndsAt: number, displayEndsAt?: number): number {
  const effectiveEndsAt = resolveDisplayEndsAt(serverEndsAt, displayEndsAt);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [effectiveEndsAt]);

  return effectiveEndsAt;
}

export function useFormattedCountdown(serverEndsAt: number, displayEndsAt?: number): string {
  const effectiveEndsAt = useCountdownTick(serverEndsAt, displayEndsAt);
  return computeTimeRemaining(effectiveEndsAt, Date.now()).formatted;
}

export function useCountdownExpired(
  serverEndsAt: number,
  displayEndsAt?: number,
  status?: AuctionStatus,
): boolean {
  const effectiveEndsAt = useCountdownTick(serverEndsAt, displayEndsAt);
  if (status === AuctionStatus.Ended) {
    return true;
  }
  return computeTimeRemaining(effectiveEndsAt, Date.now()).expired;
}
