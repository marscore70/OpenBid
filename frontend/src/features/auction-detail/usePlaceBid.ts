import { useRef, useState } from "react";
import { HttpStatusCode } from "axios";
import { HttpError, isHttpError } from "../../infrastructure/api/httpClient";
import { toSafeErrorMessage } from "../../shared/errors/toSafeErrorMessage";
import {
  bidService,
  InvalidBidResponseError,
  type PlaceBidPayload,
} from "../../infrastructure/api/bidService";
import { parsePlaceBidErrorBody } from "../../infrastructure/api/bidSchemas";
import { applyEndedFromHttpConflict } from "../../domain/auction/mergeAuctionEnded";
import { nextCurrentBidAfterOutbidRejection } from "../../domain/auction/nextCurrentBidAfterOutbidRejection";
import { nextCurrentBidderAfterOutbidRejection } from "../../domain/auction/nextCurrentBidderAfterOutbidRejection";
import { recordMyBid } from "../../shared/storage/bidderStorage";
import { logger } from "../../shared/logging/logger";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { clearDisplayTiming } from "../../app/BidStreamProvider";
import {
  fetchAuctionDetail,
  updateLoadedAuctionDetail,
} from "../../state/auctionDetailAtom";
import {
  fetchAuctionsList,
  updateAuctionSummaryInList,
} from "../../state/auctionsListAtom";

type PlaceBidMutationState = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
};

const idleMutationState: PlaceBidMutationState = {
  isPending: false,
  isError: false,
  error: null,
};

export function usePlaceBid(auctionId: string) {
  const [mutation, setMutation] =
    useState<PlaceBidMutationState>(idleMutationState);
  const inFlightRef = useRef(false);

  const mutate = (payload: PlaceBidPayload) => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setMutation({ isPending: true, isError: false, error: null });

    void bidService
      .placeBid(payload)
      .then((result) => {
        recordMyBid({
          auctionId: payload.auctionId,
          amount: payload.amount,
          timestamp: Date.now(),
        });
        logger.info("Bid placed", { bid_id: result.bid_id, auctionId });
        updateAuctionSummaryInList(auctionId, (summary) => {
          if (result.currentBid <= summary.currentBid) {
            return summary;
          }
          return {
            ...summary,
            currentBid: result.currentBid,
            currentBidder: payload.bidder,
            bidCount: summary.bidCount + 1,
          };
        });
        // Optimistic leader only — do not fabricate history timestamps or
        // endsAt (SSE owns those). Do not consume bid_id here: marking seen
        // would suppress the authoritative SSE new_bid (endsAt / history).
        updateLoadedAuctionDetail(auctionId, (detail) => {
          if (result.currentBid <= detail.currentBid) {
            return detail;
          }
          return {
            ...detail,
            currentBid: result.currentBid,
            currentBidder: payload.bidder,
          };
        });
        // Detail GET owns history; list GET owns catalog endsAt/bidCount when
        // SSE is delayed or dropped after the optimistic amount patch.
        void fetchAuctionDetail(auctionId);
        void fetchAuctionsList();
        setMutation(idleMutationState);
      })
      .catch((error: unknown) => {
        if (error instanceof InvalidBidResponseError) {
          // Server may have accepted the bid; reconcile via GET rather than
          // trusting a malformed success body into shared state. Do not record
          // My Bids until GET/SSE proves the bid — otherwise a false 200 lies.
          void fetchAuctionDetail(auctionId);
          void fetchAuctionsList();
          setMutation({
            isPending: false,
            isError: true,
            error,
          });
          logger.warn("Bid response failed validation; reconciled via GET", {
            auctionId,
          });
          return;
        }
        handlePlaceBidError(error, auctionId, payload.bidder);
        setMutation({ isPending: false, isError: true, error });
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  };

  return {
    mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

function handlePlaceBidError(
  error: unknown,
  auctionId: string,
  rejectedBidder: string,
): void {
  if (!isHttpError(error)) {
    logger.error("Bid failed", { error: String(error) });
    return;
  }

  const body = parsePlaceBidErrorBody(error.body);

  if (
    error.status === HttpStatusCode.BadRequest &&
    typeof body.currentBid === "number"
  ) {
    const rejectedCurrentBid = body.currentBid;
    // Raise the floor. Clear leader only when it is still the rejected
    // bidder — never wipe a real leader SSE already applied.
    updateLoadedAuctionDetail(auctionId, (detail) => ({
      ...detail,
      currentBid: nextCurrentBidAfterOutbidRejection(
        detail.currentBid,
        rejectedCurrentBid,
      ),
      currentBidder: nextCurrentBidderAfterOutbidRejection(
        detail.currentBidder,
        rejectedBidder,
      ),
    }));
    updateAuctionSummaryInList(auctionId, (summary) => ({
      ...summary,
      currentBid: nextCurrentBidAfterOutbidRejection(
        summary.currentBid,
        rejectedCurrentBid,
      ),
      currentBidder: nextCurrentBidderAfterOutbidRejection(
        summary.currentBidder,
        rejectedBidder,
      ),
    }));
    void fetchAuctionDetail(auctionId);
    void fetchAuctionsList();
    logger.warn("Bid rejected: outbid during delay", { auctionId });
    return;
  }

  if (error.status === HttpStatusCode.Conflict) {
    clearDisplayTiming(auctionId);
    updateAuctionSummaryInList(auctionId, (summary) =>
      applyEndedFromHttpConflict(
        summary,
        body.winner ?? null,
        body.finalPrice ?? summary.currentBid,
      ),
    );
    updateLoadedAuctionDetail(auctionId, (detail) => {
      const finalPrice = body.finalPrice ?? detail.currentBid;
      const endedBid =
        finalPrice < detail.currentBid ? detail.currentBid : finalPrice;
      const endedBidder =
        finalPrice < detail.currentBid
          ? detail.currentBidder
          : (body.winner ?? null);
      return {
        ...detail,
        status: AuctionStatus.Ended,
        currentBidder: endedBidder,
        currentBid: endedBid,
      };
    });
    logger.warn("Bid rejected: auction ended", { auctionId });
  }
}

export function getBidErrorMessage(error: unknown): string {
  if (error instanceof InvalidBidResponseError) {
    return "Bid response looked invalid. Refreshing auction state — check your bid and try again if needed.";
  }
  if (error instanceof HttpError) {
    const body = parsePlaceBidErrorBody(error.body);
    if (error.status === HttpStatusCode.Conflict) {
      return body.error || "Auction has ended.";
    }
    if (error.status === HttpStatusCode.BadRequest && body.error) {
      if (typeof body.currentBid === "number") {
        return `${body.error} Try again above $${body.currentBid}.`;
      }
      return body.error;
    }
    return body.error || toSafeErrorMessage(error);
  }
  logger.error("Bid failed with non-HTTP error", { error: String(error) });
  return toSafeErrorMessage(error);
}
