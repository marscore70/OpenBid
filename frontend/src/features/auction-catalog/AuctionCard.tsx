import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { AuctionVisualStatus } from "../../shared/types/AuctionVisualStatus";
import { auctionVisualStatus } from "../../domain/auction/auctionVisualStatus";
import { useFormattedCountdown } from "./useCountdownTick";
import { useBidStream } from "../../app/BidStreamProvider";
import { resolveDisplayEndsAt } from "../../domain/snipe/SnipeExtensionPolicy";
import { CardMeta, StatusStrip, WinnerBanner } from "../../shared/ui/layout";

type AuctionCardProps = {
  auction: AuctionSummary;
};

export function AuctionCard({ auction }: AuctionCardProps) {
  const navigate = useNavigate();
  const { getDisplayTiming, timingVersion } = useBidStream();
  void timingVersion;
  const timing = getDisplayTiming(auction.id, auction.endsAt);
  const displayEndsAt = resolveDisplayEndsAt(
    auction.endsAt,
    timing.displayEndsAt,
  );
  const countdown = useFormattedCountdown(
    auction.endsAt,
    timing.displayEndsAt,
  );
  const visual = auctionVisualStatus(auction.status, displayEndsAt, Date.now());

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
        <span>Current bid: ${auction.currentBid}</span>
        <span>Leader: {auction.currentBidder ?? "—"}</span>
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
        {auction.status === AuctionStatus.Ended && (
          <WinnerBanner>
            Winner: {auction.currentBidder ?? "No bids"} — ${auction.currentBid}
          </WinnerBanner>
        )}
      </CardMeta>
    </Card>
  );
}
