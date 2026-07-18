import { useParams } from "react-router-dom";
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
import { featureFlags } from "../../config/features";
import {
  AuctionEmoji,
  AuctionHero,
  DetailBackLink,
  DetailChartSection,
  DetailColumn,
  DetailHistorySection,
  DetailLayout,
  DetailPage,
  DetailSection,
  HeroMeta,
  StatusRow,
} from "./auctionDetailLayout";
import {
  EndedAuctionTone,
  resolveEndedAuctionPresentation,
} from "../../domain/auction/resolveEndedAuctionPresentation";
import { loadBidderName } from "../../shared/storage/bidderStorage";

export function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, backgroundErrorMessage } =
    useAuctionDetail(id);
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
    return (
      <DetailPage>
        <DetailBackLink to="/">← Back to catalog</DetailBackLink>
        <ProgressSpinner aria-label="Loading auction" />
      </DetailPage>
    );
  }

  if (isError || !data) {
    return (
      <DetailPage>
        <DetailBackLink to="/">← Back to catalog</DetailBackLink>
        <Message
          severity="error"
          text={error instanceof Error ? error.message : "Auction not found"}
        />
      </DetailPage>
    );
  }

  const biddingDisabled = data.status === AuctionStatus.Ended;
  const endedPresentation =
    data.status === AuctionStatus.Ended
      ? resolveEndedAuctionPresentation({
          currentBidder: data.currentBidder,
          currentBid: data.currentBid,
          myUsername: loadBidderName() || null,
        })
      : null;

  return (
    <DetailPage>
      <DetailBackLink to="/">← Back to catalog</DetailBackLink>
      {backgroundErrorMessage && (
        <Message severity="warn" text={backgroundErrorMessage} />
      )}
      <DetailLayout>
        <DetailColumn>
          <AuctionHero>
            <AuctionEmoji>{data.image}</AuctionEmoji>
            <HeroMeta>
              <h1>{data.title}</h1>
              <p>
                Current bid: <strong>${data.currentBid}</strong> - Leader:{" "}
                {data.currentBidder ?? "-"}
              </p>
              <StatusRow>
                {data.status === AuctionStatus.Active ? (
                  <Tag
                    severity={
                      visual === AuctionVisualStatus.Urgent
                        ? "danger"
                        : "success"
                    }
                    value={`${countdown} remaining`}
                  />
                ) : (
                  endedPresentation && (
                    <Message
                      severity={
                        endedPresentation.tone === EndedAuctionTone.Warning
                          ? "warn"
                          : endedPresentation.tone === EndedAuctionTone.Success
                            ? "success"
                            : "info"
                      }
                      text={endedPresentation.detailMessage}
                    />
                  )
                )}
                {timing.snipeExtended &&
                  data.status === AuctionStatus.Active && (
                    <Tag
                      severity="warning"
                      value="Snipe protection: time extended"
                    />
                  )}
              </StatusRow>
            </HeroMeta>
          </AuctionHero>

          <DetailSection>
            <h2>Place a bid</h2>
            <BidForm
              key={data.id}
              auctionId={data.id}
              currentBid={data.currentBid}
              startPrice={data.startPrice}
              disabled={biddingDisabled}
            />
          </DetailSection>

          {featureFlags.bidHistoryChart && (
            <DetailChartSection>
              <h2>Bid history chart</h2>
              <BidHistoryChart
                history={data.bidHistory}
                startPrice={data.startPrice}
                soldPrice={
                  data.status === AuctionStatus.Ended
                    ? data.currentBid
                    : undefined
                }
              />
            </DetailChartSection>
          )}
        </DetailColumn>

        <DetailColumn>
          <DetailHistorySection>
            <h2>Bid history</h2>
            <BidHistoryTable history={data.bidHistory} />
          </DetailHistorySection>
        </DetailColumn>
      </DetailLayout>
    </DetailPage>
  );
}
