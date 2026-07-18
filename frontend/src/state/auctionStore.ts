import { getDefaultStore } from "jotai";

/** Shared jotai store for React hooks and imperative SSE/reconcile writers. */
export const auctionStore = getDefaultStore();
