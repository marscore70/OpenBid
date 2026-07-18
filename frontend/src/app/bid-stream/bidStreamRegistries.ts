import { createDisplayTimingRegistry } from "../../domain/auction/DisplayTiming";
import { createSeenBidIdRegistry } from "../../domain/auction/dedupeBidEvent";

/** Module-level registries shared by SSE apply path and UI timing reads. */
export const seenBidIds = createSeenBidIdRegistry();
export const displayTimingRegistry = createDisplayTimingRegistry();
