import { Link, useParams } from 'react-router-dom';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useAuctionDetail } from './useAuctionDetail';
import { BidForm } from './BidForm';
import { BidHistoryTable } from './BidHistoryTable';
import { BidHistoryChart } from './BidHistoryChart';
import { useFormattedCountdown } from '../auction-catalog/useCountdownTick';
import { useBidStream } from '../../app/BidStreamProvider';
import { resolveDisplayEndsAt } from '../../domain/snipe/SnipeExtensionPolicy';
import { auctionVisualStatus } from '../../domain/auction/auctionVisualStatus';

export function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useAuctionDetail(id);
  const { displayTimingById, timingVersion } = useBidStream();
  void timingVersion;

  const serverEndsAt = data?.endsAt ?? 0;
  const timing = data ? displayTimingById.get(data.id) : undefined;
  const displayEndsAt = resolveDisplayEndsAt(serverEndsAt, timing?.displayEndsAt);
  const countdown = useFormattedCountdown(serverEndsAt, timing?.displayEndsAt);
  const visual = data
    ? auctionVisualStatus(data.status, displayEndsAt, Date.now())
    : 'active';

  if (isLoading) {
    return <ProgressSpinner aria-label="Loading auction" />;
  }

  if (isError || !data) {
    return (
      <Message
        severity="error"
        text={error instanceof Error ? error.message : 'Auction not found'}
      />
    );
  }

  const biddingDisabled = data.status === 'ended';

  return (
    <div>
      <Link to="/">← Back to catalog</Link>
      <div style={{ fontSize: '3rem', margin: '0.5rem 0' }}>{data.image}</div>
      <h1>{data.title}</h1>
      <p>
        Current bid: <strong>${data.currentBid}</strong> — Leader:{' '}
        {data.currentBidder ?? '—'}
      </p>
      {data.status === 'active' ? (
        <Tag
          severity={visual === 'urgent' ? 'danger' : 'success'}
          value={`${countdown} remaining`}
        />
      ) : (
        <Message
          severity="success"
          text={`Auction ended. Winner: ${data.currentBidder ?? 'None'} at $${data.currentBid}`}
        />
      )}
      {timing?.snipeExtended && data.status === 'active' && (
        <Tag severity="warning" value="Snipe protection: time extended (display only)" />
      )}

      <section style={{ marginTop: '1.5rem' }}>
        <h2>Place a bid</h2>
        <BidForm auctionId={data.id} currentBid={data.currentBid} disabled={biddingDisabled} />
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>Bid history</h2>
        <BidHistoryTable history={data.bidHistory} />
        <BidHistoryChart history={data.bidHistory} />
      </section>
    </div>
  );
}
