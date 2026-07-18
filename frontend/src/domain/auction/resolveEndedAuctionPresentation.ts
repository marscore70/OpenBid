export const EndedAuctionOutcome = {
  NoBids: "no_bids",
  WonByMe: "won_by_me",
  WonByOther: "won_by_other",
} as const;

export type EndedAuctionOutcome =
  (typeof EndedAuctionOutcome)[keyof typeof EndedAuctionOutcome];

export const EndedAuctionTone = {
  Warning: "warning",
  Success: "success",
  Neutral: "neutral",
} as const;

export type EndedAuctionTone =
  (typeof EndedAuctionTone)[keyof typeof EndedAuctionTone];

const ENDED_WITHOUT_BIDS_MESSAGE = "Auction ended without bids";
const NO_BIDS_YET_MESSAGE = "No bids yet";

export type EndedAuctionPresentation = {
  outcome: EndedAuctionOutcome;
  tone: EndedAuctionTone;
  catalogMessage: string;
  detailMessage: string;
};

type ResolveEndedAuctionPresentationInput = {
  currentBidder: string | null;
  currentBid: number;
  myUsername: string | null;
};

export function resolveEndedAuctionPresentation(
  input: ResolveEndedAuctionPresentationInput,
): EndedAuctionPresentation {
  if (input.currentBidder === null) {
    return {
      outcome: EndedAuctionOutcome.NoBids,
      tone: EndedAuctionTone.Warning,
      catalogMessage: NO_BIDS_YET_MESSAGE,
      detailMessage: ENDED_WITHOUT_BIDS_MESSAGE,
    };
  }

  if (input.myUsername !== null && input.currentBidder === input.myUsername) {
    return {
      outcome: EndedAuctionOutcome.WonByMe,
      tone: EndedAuctionTone.Success,
      catalogMessage: `You won - $${input.currentBid}`,
      detailMessage: `Auction ended. You won at $${input.currentBid}`,
    };
  }

  return {
    outcome: EndedAuctionOutcome.WonByOther,
    tone: EndedAuctionTone.Neutral,
    catalogMessage: `Winner: ${input.currentBidder} - $${input.currentBid}`,
    detailMessage: `Auction ended. Winner: ${input.currentBidder} at $${input.currentBid}`,
  };
}
