export const SseConnectionStatus = {
  Connecting: "connecting",
  Connected: "connected",
  Disconnected: "disconnected",
  Reconnecting: "reconnecting",
} as const;

export type SseConnectionStatus =
  (typeof SseConnectionStatus)[keyof typeof SseConnectionStatus];
