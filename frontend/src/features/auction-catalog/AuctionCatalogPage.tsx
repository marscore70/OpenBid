import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { useAuctionList } from './useAuctionList';
import { AuctionCard } from './AuctionCard';
import { CatalogGrid } from '../../shared/ui/layout';

export function AuctionCatalogPage() {
  const { data, isLoading, isError, error, refetch } = useAuctionList();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <ProgressSpinner aria-label="Loading auctions" />
      </div>
    );
  }

  if (isError) {
    return (
      <Message
        severity="error"
        text={error instanceof Error ? error.message : 'Failed to load auctions'}
      />
    );
  }

  if (!data?.length) {
    return (
      <Message
        severity="info"
        text="No auctions available. Is the mock server running on port 3005?"
      />
    );
  }

  return (
    <>
      <CatalogGrid>
        {data.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </CatalogGrid>
      <button type="button" onClick={() => void refetch()} style={{ marginTop: '1rem' }}>
        Refresh list
      </button>
    </>
  );
}
