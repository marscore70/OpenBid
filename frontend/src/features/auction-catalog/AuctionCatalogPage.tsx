import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";
import { Button } from "primereact/button";
import styled from "styled-components";
import { useAuctionListReader } from "./useAuctionList";
import { AuctionCard } from "./AuctionCard";
import { CatalogGrid } from "../../shared/ui/layout";
import { ScrollPane } from "../../shared/ui/layoutPrimitives";

const CatalogLoading = styled(ScrollPane)`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

const ErrorActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
`;

export function AuctionCatalogPage() {
  const {
    data,
    isLoading,
    isError,
    errorMessage,
    backgroundErrorMessage,
    refetch,
  } = useAuctionListReader();

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
        <ErrorActions>
          <Message severity="error" text={errorMessage} />
          <Button
            type="button"
            label="Retry"
            icon="pi pi-refresh"
            onClick={() => void refetch()}
          />
        </ErrorActions>
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
      {backgroundErrorMessage && (
        <Message severity="warn" text={backgroundErrorMessage} />
      )}
      <CatalogGrid>
        {data.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </CatalogGrid>
    </ScrollPane>
  );
}
