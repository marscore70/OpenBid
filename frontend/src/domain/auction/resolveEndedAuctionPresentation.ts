import { isSameBidderIdentity } from "../bid/sanitizeBidderName";

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

const CLOSED_WITHOUT_SALE_MESSAGE = "Closed without a sale";

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
      catalogMessage: CLOSED_WITHOUT_SALE_MESSAGE,
      detailMessage: CLOSED_WITHOUT_SALE_MESSAGE,
    };
  }

  if (isSameBidderIdentity(input.currentBidder, input.myUsername)) {
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
