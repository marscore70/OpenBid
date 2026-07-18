import { AuctionStatus } from "../../shared/types/AuctionStatus";

export const ActiveBidPresentationKind = {
  Opening: "opening",
  Led: "led",
  EndedWithoutBids: "ended_without_bids",
} as const;

export type ActiveBidPresentationKind =
  (typeof ActiveBidPresentationKind)[keyof typeof ActiveBidPresentationKind];

export type ActiveBidPresentation =
  | {
      kind: typeof ActiveBidPresentationKind.Opening;
      startPrice: number;
    }
  | {
      kind: typeof ActiveBidPresentationKind.Led;
      currentBid: number;
      leader: string;
    }
  | {
      kind: typeof ActiveBidPresentationKind.EndedWithoutBids;
    };

type ResolveActiveBidPresentationInput = {
  currentBid: number;
  currentBidder: string | null;
  startPrice: number;
  status: AuctionStatus;
};

/** Catalog/detail bid line: opening floor vs current leader vs ended with no bids. */
export function resolveActiveBidPresentation(
  input: ResolveActiveBidPresentationInput,
): ActiveBidPresentation {
  if (input.currentBidder !== null) {
    return {
      kind: ActiveBidPresentationKind.Led,
      currentBid: input.currentBid,
      leader: input.currentBidder,
    };
  }

  if (input.status === AuctionStatus.Ended) {
    return { kind: ActiveBidPresentationKind.EndedWithoutBids };
  }

  // Seeded mock state: currentBid === startPrice and no leader yet.
  if (input.currentBid <= input.startPrice) {
    return {
      kind: ActiveBidPresentationKind.Opening,
      startPrice: input.startPrice,
    };
  }

  return {
    kind: ActiveBidPresentationKind.Led,
    currentBid: input.currentBid,
    leader: "—",
  };
}
