import {
  fetchAuctionDetail,
  listTrackedAuctionDetailIds,
} from "../../state/auctionDetailAtom";
import { fetchAuctionsList } from "../../state/auctionsListAtom";
import { logger } from "../../shared/logging/logger";

/** Refetches catalog + tracked detail atoms after an SSE reconnect gap. */
export function reconcileAfterReconnect(): void {
  void fetchAuctionsList({ force: true });
  const detailIds = listTrackedAuctionDetailIds();
  for (const auctionId of detailIds) {
    void fetchAuctionDetail(auctionId);
  }
  logger.info("Reconciled auction data after SSE reconnect");
}
