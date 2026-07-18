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
import { recordMyBid } from "../../shared/storage/bidderStorage";
import { logger } from "../../shared/logging/logger";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { clearDisplayTiming } from "../../app/BidStreamProvider";
import {
  fetchAuctionDetail,
  updateLoadedAuctionDetail,
} from "../../state/auctionDetailAtom";
import { updateAuctionSummaryInList } from "../../state/auctionsListAtom";

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
        updateLoadedAuctionDetail(auctionId, (detail) => {
          if (result.currentBid <= detail.currentBid) {
            return detail;
          }
          return {
            ...detail,
            currentBid: result.currentBid,
            currentBidder: payload.bidder,
            bidHistory: [
              ...detail.bidHistory,
              {
                bidder: payload.bidder,
                amount: payload.amount,
                timestamp: Date.now(),
              },
            ],
          };
        });
        void fetchAuctionDetail(auctionId);
        setMutation(idleMutationState);
      })
      .catch((error: unknown) => {
        if (error instanceof InvalidBidResponseError) {
          // Server may have accepted the bid; reconcile via GET rather than
          // trusting a malformed success body into shared state.
          recordMyBid({
            auctionId: payload.auctionId,
            amount: payload.amount,
            timestamp: Date.now(),
          });
          void fetchAuctionDetail(auctionId);
          setMutation(idleMutationState);
          logger.warn("Bid response failed validation; reconciled via GET", {
            auctionId,
          });
          return;
        }
        handlePlaceBidError(error, auctionId);
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

function handlePlaceBidError(error: unknown, auctionId: string): void {
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
    updateLoadedAuctionDetail(auctionId, (detail) => ({
      ...detail,
      currentBid: nextCurrentBidAfterOutbidRejection(
        detail.currentBid,
        rejectedCurrentBid,
      ),
    }));
    updateAuctionSummaryInList(auctionId, (summary) => ({
      ...summary,
      currentBid: nextCurrentBidAfterOutbidRejection(
        summary.currentBid,
        rejectedCurrentBid,
      ),
    }));
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
  if (error instanceof HttpError) {
    const body = parsePlaceBidErrorBody(error.body);
    if (error.status === HttpStatusCode.Conflict) {
      return body.error ?? "Auction has ended.";
    }
    if (error.status === HttpStatusCode.BadRequest && body.error) {
      if (typeof body.currentBid === "number") {
        return `${body.error} Try again above $${body.currentBid}.`;
      }
      return body.error;
    }
    return body.error ?? toSafeErrorMessage(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Could not place bid.";
}
