export type TimeRemaining = {
  totalMs: number;
  minutes: number;
  seconds: number;
  formatted: string;
  expired: boolean;
};

export function computeTimeRemaining(endsAt: number, nowMs: number): TimeRemaining {
  const totalMs = Math.max(0, endsAt - nowMs);
  const expired = totalMs <= 0;
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { totalMs, minutes, seconds, formatted, expired };
}
