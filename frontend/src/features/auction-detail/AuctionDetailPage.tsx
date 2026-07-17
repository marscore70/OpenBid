import { Link, useParams } from "react-router-dom";
import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAuctionDetail } from "./useAuctionDetail";
import { BidForm } from "./BidForm";
import { BidHistoryTable } from "./BidHistoryTable";
import { BidHistoryChart } from "./BidHistoryChart";
import { useFormattedCountdown } from "../auction-catalog/useCountdownTick";
import { useBidStream } from "../../app/BidStreamProvider";
import { resolveDisplayEndsAt } from "../../domain/snipe/SnipeExtensionPolicy";
import { auctionVisualStatus } from "../../domain/auction/auctionVisualStatus";
import { createDefaultDisplayTiming } from "../../domain/auction/DisplayTiming";
import { AuctionStatus } from "../../shared/types/AuctionStatus";
import { AuctionVisualStatus } from "../../shared/types/AuctionVisualStatus";

export function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useAuctionDetail(id);
  const { getDisplayTiming, timingVersion } = useBidStream();
  void timingVersion;

  const serverEndsAt = data?.endsAt ?? 0;
  const timing = data
    ? getDisplayTiming(data.id, data.endsAt)
    : createDefaultDisplayTiming(serverEndsAt);
  const displayEndsAt = resolveDisplayEndsAt(
    serverEndsAt,
    timing.displayEndsAt,
  );
  const countdown = useFormattedCountdown(serverEndsAt, timing.displayEndsAt);
  const visual = data
    ? auctionVisualStatus(data.status, displayEndsAt, Date.now())
    : AuctionVisualStatus.Active;

  if (isLoading) {
    return <ProgressSpinner aria-label="Loading auction" />;
  }

  if (isError || !data) {
    return (
      <Message
        severity="error"
        text={error instanceof Error ? error.message : "Auction not found"}
      />
    );
  }

  const biddingDisabled = data.status === AuctionStatus.Ended;

  return (
    <div>
      <Link to="/">← Back to catalog</Link>
      <div style={{ fontSize: "3rem", margin: "0.5rem 0" }}>{data.image}</div>
      <h1>{data.title}</h1>
      <p>
        Current bid: <strong>${data.currentBid}</strong> — Leader:{" "}
        {data.currentBidder ?? "—"}
      </p>
      {data.status === AuctionStatus.Active ? (
        <Tag
          severity={
            visual === AuctionVisualStatus.Urgent ? "danger" : "success"
          }
          value={`${countdown} remaining`}
        />
      ) : (
        <Message
          severity="success"
          text={`Auction ended. Winner: ${data.currentBidder ?? "None"} at $${data.currentBid}`}
        />
      )}
      {timing.snipeExtended && data.status === AuctionStatus.Active && (
        <Tag
          severity="warning"
          value="Snipe protection: time extended (display only)"
        />
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Place a bid</h2>
        <BidForm
          auctionId={data.id}
          currentBid={data.currentBid}
          startPrice={data.startPrice}
          disabled={biddingDisabled}
        />
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Bid history</h2>
        <BidHistoryTable history={data.bidHistory} />
        <BidHistoryChart history={data.bidHistory} />
      </section>
    </div>
  );
}
