import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";
import styled from "styled-components";
import { useAuctionList } from "./useAuctionList";
import { AuctionCard } from "./AuctionCard";
import { CatalogGrid } from "../../shared/ui/layout";
import { ScrollPane } from "../../shared/ui/layoutPrimitives";

const CatalogLoading = styled(ScrollPane)`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

export function AuctionCatalogPage() {
  const { data, isLoading, isError, error } = useAuctionList();

  if (isLoading) {
    return (
      <CatalogLoading>
        <ProgressSpinner aria-label="Loading auctions" />
      </CatalogLoading>
    );
  }

  if (isError) {
    return (
      <ScrollPane>
        <Message
          severity="error"
          text={
            error instanceof Error ? error.message : "Failed to load auctions"
          }
        />
      </ScrollPane>
    );
  }

  if (!data?.length) {
    return (
      <ScrollPane>
        <Message
          severity="info"
          text="No auctions available. Is the mock server running on port 3005?"
        />
      </ScrollPane>
    );
  }

  return (
    <ScrollPane>
      <CatalogGrid>
        {data.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </CatalogGrid>
    </ScrollPane>
  );
}
