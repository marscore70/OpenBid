import { useState } from "react";
import { HttpError } from "../../infrastructure/api/httpClient";
import {
  bidService,
  isPlaceBidHttpError,
  type PlaceBidPayload,
} from "../../infrastructure/api/bidService";
import { applyEndedFromHttpConflict } from "../../domain/auction/mergeAuctionEnded";
import { recordMyBid } from "../../shared/storage/bidderStorage";
import { logger } from "../../shared/logging/logger";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { useBidStream } from "../../app/BidStreamProvider";
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
  const { clearDisplayTiming } = useBidStream();
  const [mutation, setMutation] =
    useState<PlaceBidMutationState>(idleMutationState);

  const mutate = (payload: PlaceBidPayload) => {
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
        void fetchAuctionDetail(auctionId);
        setMutation(idleMutationState);
      })
      .catch((error: unknown) => {
        handlePlaceBidError(error, auctionId, clearDisplayTiming);
        setMutation({ isPending: false, isError: true, error });
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
  clearDisplayTiming: (auctionId: string) => void,
): void {
  if (!isPlaceBidHttpError(error)) {
    logger.error("Bid failed", { error: String(error) });
    return;
  }

  const body = error.body as {
    currentBid?: number;
    winner?: string | null;
    finalPrice?: number;
  };

  if (error.status === 400 && typeof body.currentBid === "number") {
    const currentBid = body.currentBid;
    updateLoadedAuctionDetail(auctionId, (detail) => ({
      ...detail,
      currentBid,
    }));
    updateAuctionSummaryInList(auctionId, (summary) => ({
      ...summary,
      currentBid,
    }));
    logger.warn("Bid rejected: outbid during delay", { auctionId });
    return;
  }

  if (error.status === 409) {
    clearDisplayTiming(auctionId);
    updateAuctionSummaryInList(auctionId, (summary) =>
      applyEndedFromHttpConflict(
        summary,
        body.winner ?? null,
        body.finalPrice ?? summary.currentBid,
      ),
    );
    updateLoadedAuctionDetail(auctionId, (detail) => ({
      ...detail,
      status: AuctionStatus.Ended,
      currentBidder: body.winner ?? null,
      currentBid: body.finalPrice ?? detail.currentBid,
    }));
    logger.warn("Bid rejected: auction ended", { auctionId });
  }
}

export function getBidErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const body = error.body as { error?: string; currentBid?: number };
    if (error.status === 409) {
      return body.error ?? "Auction has ended.";
    }
    if (error.status === 400 && body.error) {
      if (typeof body.currentBid === "number") {
        return `${body.error} Try again above $${body.currentBid}.`;
      }
      return body.error;
    }
    return body.error ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Could not place bid.";
}
