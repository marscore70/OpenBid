import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpError } from '../../infrastructure/api/httpClient';
import { isPlaceBidHttpError, placeBid } from '../../infrastructure/api/bidApi';
import { queryKeys } from '../../shared/queryKeys';
import type { AuctionSummary } from '../../shared/types/AuctionSummary';
import type { AuctionDetail } from '../../shared/types/AuctionDetail';
import { applyEndedFromHttpConflict } from '../../domain/auction/mergeAuctionState';
import { recordMyBid } from '../../shared/storage/bidderStorage';
import { logger } from '../../shared/logging/logger';

export function usePlaceBid(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeBid,
    onSuccess: (result, variables) => {
      recordMyBid({
        auctionId: variables.auctionId,
        amount: variables.amount,
        timestamp: Date.now(),
      });
      logger.info('Bid placed', { bid_id: result.bid_id, auctionId });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auctionDetail(auctionId) });
    },
    onError: (error) => {
      if (!isPlaceBidHttpError(error)) {
        logger.error('Bid failed', { error: String(error) });
        return;
      }
      const body = error.body as {
        currentBid?: number;
        winner?: string | null;
        finalPrice?: number;
      };
      if (error.status === 400 && typeof body.currentBid === 'number') {
        queryClient.setQueryData<AuctionDetail>(
          queryKeys.auctionDetail(auctionId),
          (old) => (old ? { ...old, currentBid: body.currentBid! } : old),
        );
        queryClient.setQueryData<AuctionSummary[]>(queryKeys.auctions, (old) =>
          old?.map((a) =>
            a.id === auctionId ? { ...a, currentBid: body.currentBid! } : a,
          ),
        );
        logger.warn('Bid rejected: outbid during delay', { auctionId });
      }
      if (error.status === 409) {
        const displayTiming = new Map();
        queryClient.setQueryData<AuctionSummary[]>(queryKeys.auctions, (old) =>
          old?.map((a) =>
            a.id === auctionId
              ? applyEndedFromHttpConflict(
                  a,
                  body.winner ?? null,
                  body.finalPrice ?? a.currentBid,
                  displayTiming,
                )
              : a,
          ),
        );
        queryClient.setQueryData<AuctionDetail>(
          queryKeys.auctionDetail(auctionId),
          (old) =>
            old
              ? {
                  ...old,
                  status: 'ended',
                  currentBidder: body.winner ?? null,
                  currentBid: body.finalPrice ?? old.currentBid,
                }
              : old,
        );
        logger.warn('Bid rejected: auction ended', { auctionId });
      }
    },
  });
}

export function getBidErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const body = error.body as { error?: string; currentBid?: number };
    if (error.status === 409) {
      return body.error ?? 'Auction has ended.';
    }
    if (error.status === 400 && body.error) {
      if (typeof body.currentBid === 'number') {
        return `${body.error} Try again above $${body.currentBid}.`;
      }
      return body.error;
    }
    return body.error ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Could not place bid.';
}
