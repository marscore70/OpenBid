import type { ReactNode } from "react";
import { useBidStreamSubscription } from "./useBidStreamSubscription";

/** Thin composition root: starts the SSE subscription for the app tree. */
export function BidStreamProvider({ children }: { children: ReactNode }) {
  useBidStreamSubscription();
  return children;
}
