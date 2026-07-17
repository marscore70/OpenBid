import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bidStreamService } from '../infrastructure/sse/bidStreamService';
import type { SseConnectionStatus } from '../shared/types/SseConnectionStatus';
import { queryKeys } from '../shared/queryKeys';
import type { AuctionSummary } from '../shared/types/AuctionSummary';
import type { AuctionDetail } from '../shared/types/AuctionDetail';
import {
  mergeAuctionEndedIntoDetail,
  mergeAuctionEndedIntoSummary,
  mergeNewBidIntoDetail,
  mergeNewBidIntoSummary,
  type DisplayTiming,
} from '../domain/auction/mergeAuctionState';
import { logger } from '../shared/logging/logger';
import { loadBidderName } from '../shared/storage/bidderStorage';
import { createOutbidNotifier, shouldNotifyOutbid } from '../features/notifications/outbidNotifier';

type BidStreamContextValue = {
  connectionStatus: SseConnectionStatus;
  displayTimingById: Map<string, DisplayTiming>;
  timingVersion: number;
  registerOutbidToast: (handler: (detail: string) => void) => void;
  enableNotificationSound: () => void;
};

const BidStreamContext = createContext<BidStreamContextValue | null>(null);

export function BidStreamProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const seenBidIdsRef = useRef(new Set<string>());
  const displayTimingRef = useRef(new Map<string, DisplayTiming>());
  const [connectionStatus, setConnectionStatus] = useState<SseConnectionStatus>('disconnected');
  const [timingVersion, setTimingVersion] = useState(0);
  const toastHandlerRef = useRef<((detail: string) => void) | null>(null);

  const outbidNotifier = useMemo(
    () =>
      createOutbidNotifier(
        (detail) => toastHandlerRef.current?.(detail),
        (auctionId) =>
          queryClient
            .getQueryData<AuctionSummary[]>(queryKeys.auctions)
            ?.find((a) => a.id === auctionId)?.title,
        () => loadBidderName(),
      ),
    [queryClient],
  );

  const registerOutbidToast = useCallback((handler: (detail: string) => void) => {
    toastHandlerRef.current = handler;
  }, []);

  const refetchAfterReconnect = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auctions });
    const detailQueries = queryClient.getQueriesData<AuctionDetail>({
      queryKey: ['auction'],
    });
    detailQueries.forEach(([key]) => {
      void queryClient.invalidateQueries({ queryKey: key });
    });
    logger.info('Reconciled auction data after SSE reconnect');
  }, [queryClient]);

  useEffect(() => {
    let wasConnected = false;
    const unsubStatus = bidStreamService.onStatus((status) => {
      setConnectionStatus(status);
      if (status === 'connected' && wasConnected) {
        refetchAfterReconnect();
      }
      if (status === 'connected') {
        wasConnected = true;
      }
    });

    const unsubEvents = bidStreamService.subscribe((event) => {
      if (event.type === 'new_bid') {
        const username = loadBidderName();
        if (shouldNotifyOutbid(event.payload, username)) {
          const title =
            queryClient
              .getQueryData<AuctionSummary[]>(queryKeys.auctions)
              ?.find((a) => a.id === event.payload.auctionId)?.title ?? 'Auction';
          outbidNotifier.notifyOutbid({
            auctionId: event.payload.auctionId,
            title,
            amount: event.payload.amount,
          });
        }

        queryClient.setQueryData<AuctionSummary[]>(queryKeys.auctions, (old) => {
          if (!old) {
            return old;
          }
          let snipeUpdated = false;
          const next = old.map((auction) => {
            const before = displayTimingRef.current.get(auction.id)?.displayEndsAt;
            const merged = mergeNewBidIntoSummary(
              auction,
              event.payload,
              seenBidIdsRef.current,
              displayTimingRef.current,
            );
            const after = displayTimingRef.current.get(auction.id)?.displayEndsAt;
            if (before !== after) {
              snipeUpdated = true;
            }
            return merged ?? auction;
          });
          if (snipeUpdated) {
            setTimingVersion((v) => v + 1);
          }
          return next;
        });

        queryClient.setQueryData<AuctionDetail>(
          queryKeys.auctionDetail(event.payload.auctionId),
          (old) => {
            if (!old) {
              return old;
            }
            return (
              mergeNewBidIntoDetail(
                old,
                event.payload,
                seenBidIdsRef.current,
                displayTimingRef.current,
              ) ?? old
            );
          },
        );
      }

      if (event.type === 'auction_ended') {
        queryClient.setQueryData<AuctionSummary[]>(queryKeys.auctions, (old) => {
          if (!old) {
            return old;
          }
          return old.map((auction) => {
            const merged = mergeAuctionEndedIntoSummary(
              auction,
              event.payload,
              displayTimingRef.current,
            );
            return merged ?? auction;
          });
        });

        queryClient.setQueryData<AuctionDetail>(
          queryKeys.auctionDetail(event.payload.auctionId),
          (old) => {
            if (!old) {
              return old;
            }
            return (
              mergeAuctionEndedIntoDetail(
                old,
                event.payload,
                displayTimingRef.current,
              ) ?? old
            );
          },
        );
      }
    });

    bidStreamService.start();
    return () => {
      unsubEvents();
      unsubStatus();
      bidStreamService.stop();
    };
  }, [outbidNotifier, queryClient, refetchAfterReconnect]);

  const value = useMemo(
    () => ({
      connectionStatus,
      displayTimingById: displayTimingRef.current,
      timingVersion,
      registerOutbidToast,
      enableNotificationSound: () => outbidNotifier.enableSound(),
    }),
    [connectionStatus, timingVersion, outbidNotifier, registerOutbidToast],
  );

  return (
    <BidStreamContext.Provider value={value}>{children}</BidStreamContext.Provider>
  );
}

export function useBidStream(): BidStreamContextValue {
  const ctx = useContext(BidStreamContext);
  if (!ctx) {
    throw new Error('useBidStream must be used within BidStreamProvider');
  }
  return ctx;
}
