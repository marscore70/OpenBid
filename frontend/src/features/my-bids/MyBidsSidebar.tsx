import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import styled from 'styled-components';
import { featureFlags } from '../../config/features';
import { useAuctionList } from '../auction-catalog/useAuctionList';
import { deriveMyBidStatus, type MyBidEntry } from './deriveMyBidStatus';
import { getMyLastBid, loadBidderName } from '../../shared/storage/bidderStorage';
import { Link } from 'react-router-dom';

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const severityForStatus = (status: MyBidEntry['status']) => {
  switch (status) {
    case 'winning':
      return 'success';
    case 'outbid':
      return 'warning';
    case 'won':
      return 'info';
    case 'lost':
      return 'danger';
    default:
      return 'secondary';
  }
};

export function MyBidsSidebar() {
  const { data } = useAuctionList();
  const username = loadBidderName();

  if (!featureFlags.myBidsTracker) {
    return null;
  }

  const entries: MyBidEntry[] = [];

  for (const auction of data ?? []) {
    const myLastBid = getMyLastBid(auction.id);
    const status = deriveMyBidStatus(auction, username, myLastBid);
    if (!status) {
      continue;
    }
    entries.push({
      auctionId: auction.id,
      title: auction.title,
      image: auction.image,
      status,
      currentBid: auction.currentBid,
      myLastBid,
    });
  }

  return (
    <Card title="My bids">
      {!username && (
        <p style={{ fontSize: '0.875rem' }}>Place a bid to track your auctions here.</p>
      )}
      {username && entries.length === 0 && (
        <p style={{ fontSize: '0.875rem' }}>No tracked bids yet.</p>
      )}
      <List>
        {entries.map((entry) => (
          <li key={entry.auctionId}>
            <Link to={`/auctions/${entry.auctionId}`}>
              {entry.image} {entry.title}
            </Link>
            <div>
              <Tag severity={severityForStatus(entry.status)} value={entry.status} />
              {entry.myLastBid !== undefined && (
                <span style={{ marginLeft: '0.35rem', fontSize: '0.75rem' }}>
                  You: ${entry.myLastBid} · High: ${entry.currentBid}
                </span>
              )}
            </div>
          </li>
        ))}
      </List>
    </Card>
  );
}
