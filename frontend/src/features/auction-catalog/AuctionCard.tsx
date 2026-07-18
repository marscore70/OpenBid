import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { AuctionVisualStatus } from "../../shared/types/AuctionVisualStatus";
import { auctionVisualStatus } from "../../domain/auction/auctionVisualStatus";
import { resolveActiveBidPresentation } from "../../domain/auction/resolveActiveBidPresentation";
import { resolveEndedAuctionPresentation } from "../../domain/auction/resolveEndedAuctionPresentation";
import { useFormattedCountdown } from "./useCountdownTick";
import {
  useBidStreamTimingVersion,
  getDisplayTiming,
} from "../../app/BidStreamProvider";
import { resolveDisplayEndsAt } from "../../domain/snipe/SnipeExtensionPolicy";
import { loadBidderName } from "../../shared/storage/bidderStorage";
import { CardMeta, StatusStrip, WinnerBanner } from "../../shared/ui/layout";
import { formatActiveBidSummaryLines } from "./formatActiveBidSummaryLines";

type AuctionCardProps = {
  auction: AuctionSummary;
};

export function AuctionCard({ auction }: AuctionCardProps) {
  const navigate = useNavigate();
  const timingVersion = useBidStreamTimingVersion();
  void timingVersion;
  const timing = getDisplayTiming(auction.id, auction.endsAt);
  const displayEndsAt = resolveDisplayEndsAt(
    auction.endsAt,
    timing.displayEndsAt,
  );
  const countdown = useFormattedCountdown(auction.endsAt, timing.displayEndsAt);
  const visual = auctionVisualStatus(auction.status, displayEndsAt, Date.now());
  const bidSummaryLines = formatActiveBidSummaryLines(
    resolveActiveBidPresentation({
      currentBid: auction.currentBid,
      currentBidder: auction.currentBidder,
      startPrice: auction.startPrice,
      status: auction.status,
    }),
  );
  const endedPresentation =
    auction.status === AuctionStatus.Ended
      ? resolveEndedAuctionPresentation({
          currentBidder: auction.currentBidder,
          currentBid: auction.currentBid,
          myUsername: loadBidderName() || null,
        })
      : null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          navigate(`/auctions/${auction.id}`);
        }
      }}
      onClick={() => navigate(`/auctions/${auction.id}`)}
      style={{ cursor: "pointer", padding: 0 }}
    >
      <StatusStrip $status={visual} />
      <CardMeta>
        <div style={{ fontSize: "2rem" }}>{auction.image}</div>
        <strong>{auction.title}</strong>
        {bidSummaryLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
        {auction.status === AuctionStatus.Active ? (
          <Tag
            severity={
              visual === AuctionVisualStatus.Urgent ? "danger" : "success"
            }
            value={`${countdown} left`}
          />
        ) : (
          <Tag severity="secondary" value="Ended" />
        )}
        {timing.snipeExtended && auction.status === AuctionStatus.Active && (
          <Tag severity="warning" value="Time extended" />
        )}
        {endedPresentation && (
          <WinnerBanner $tone={endedPresentation.tone}>
            {endedPresentation.catalogMessage}
          </WinnerBanner>
        )}
      </CardMeta>
    </Card>
  );
}
