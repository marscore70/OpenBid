export const LoadStatus = {
  Idle: "idle",
  Loading: "loading",
  Success: "success",
  Error: "error",
} as const;

export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus];
