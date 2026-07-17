import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import type { AuctionSummary } from '../../shared/types/AuctionSummary';
import { auctionVisualStatus } from '../../domain/auction/auctionVisualStatus';
import { useFormattedCountdown } from './useCountdownTick';
import { useBidStream } from '../../app/BidStreamProvider';
import { resolveDisplayEndsAt } from '../../domain/snipe/SnipeExtensionPolicy';
import { CardMeta, StatusStrip, WinnerBanner } from '../../shared/ui/layout';

type AuctionCardProps = {
  auction: AuctionSummary;
};

export function AuctionCard({ auction }: AuctionCardProps) {
  const navigate = useNavigate();
  const { displayTimingById, timingVersion } = useBidStream();
  void timingVersion;
  const timing = displayTimingById.get(auction.id);
  const displayEndsAt = resolveDisplayEndsAt(auction.endsAt, timing?.displayEndsAt);
  const countdown = useFormattedCountdown(auction.endsAt, timing?.displayEndsAt);
  const visual = auctionVisualStatus(auction.status, displayEndsAt, Date.now());

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          navigate(`/auctions/${auction.id}`);
        }
      }}
      onClick={() => navigate(`/auctions/${auction.id}`)}
      style={{ cursor: 'pointer', padding: 0 }}
    >
      <StatusStrip $status={visual} />
      <CardMeta>
        <div style={{ fontSize: '2rem' }}>{auction.image}</div>
        <strong>{auction.title}</strong>
        <span>Current bid: ${auction.currentBid}</span>
        <span>Leader: {auction.currentBidder ?? '—'}</span>
        {auction.status === 'active' ? (
          <Tag
            severity={visual === 'urgent' ? 'danger' : 'success'}
            value={`${countdown} left`}
          />
        ) : (
          <Tag severity="secondary" value="Ended" />
        )}
        {timing?.snipeExtended && auction.status === 'active' && (
          <Tag severity="warning" value="Time extended" />
        )}
        {auction.status === 'ended' && (
          <WinnerBanner>
            Winner: {auction.currentBidder ?? 'No bids'} — ${auction.currentBid}
          </WinnerBanner>
        )}
      </CardMeta>
    </Card>
  );
}
