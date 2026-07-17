import { useState } from "react";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { featureFlags } from "../../config/features";
import { useAuctionList } from "../auction-catalog/useAuctionList";
import { deriveMyBidStatus, type MyBidEntry } from "./deriveMyBidStatus";
import {
  getMyLastBid,
  loadBidderName,
} from "../../shared/storage/bidderStorage";
import { MyBidStatus } from "../../shared/types/MyBidStatus";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import { InvisibleScroll } from "../../shared/ui/InvisibleScroll";

const SidebarCard = styled(Card)`
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;

  .p-card-body,
  .p-card-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }
`;

const SidebarListScroll = styled(InvisibleScroll)`
  flex: 1;
  min-height: 0;
`;

const DialogListScroll = styled(InvisibleScroll)`
  max-height: min(70vh, 520px);
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

function severityForStatus(status: MyBidEntry["status"]) {
  switch (status) {
    case MyBidStatus.Winning:
      return "success";
    case MyBidStatus.Outbid:
      return "warning";
    case MyBidStatus.Won:
      return "info";
    case MyBidStatus.Lost:
      return "danger";
    default:
      return "secondary";
  }
}

type MyBidListItemsProps = {
  entries: MyBidEntry[];
  onNavigate?: () => void;
};

function MyBidListItems({ entries, onNavigate }: MyBidListItemsProps) {
  return (
    <List>
      {entries.map((entry) => (
        <li key={entry.auctionId}>
          <Link to={`/auctions/${entry.auctionId}`} onClick={onNavigate}>
            {entry.image} {entry.title}
          </Link>
          <div>
            <Tag
              severity={severityForStatus(entry.status)}
              value={entry.status}
            />
            <span style={{ marginLeft: "0.35rem", fontSize: "0.75rem" }}>
              You: ${entry.myLastBid} · High: ${entry.currentBid}
            </span>
          </div>
        </li>
      ))}
    </List>
  );
}

function collectMyBidEntries(
  auctions: readonly AuctionSummary[] | undefined,
  username: string,
): MyBidEntry[] {
  const entries: MyBidEntry[] = [];
  for (const auction of auctions ?? []) {
    const myLastBid = getMyLastBid(auction.id);
    if (myLastBid === undefined) {
      continue;
    }
    entries.push({
      auctionId: auction.id,
      title: auction.title,
      image: auction.image,
      status: deriveMyBidStatus(auction, username, myLastBid),
      currentBid: auction.currentBid,
      myLastBid,
    });
  }
  return entries;
}

export function MyBidsSidebar() {
  const { data } = useAuctionList();
  const username = loadBidderName();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!featureFlags.myBidsTracker) {
    return null;
  }

  const entries = collectMyBidEntries(data, username);
  const closeDialog = () => setDialogOpen(false);

  return (
    <>
      <SidebarCard
        title={
          <HeaderActions>
            <span>My bids</span>
            <Button
              type="button"
              label="View all"
              icon="pi pi-external-link"
              text
              size="small"
              disabled={entries.length === 0}
              onClick={() => setDialogOpen(true)}
              aria-haspopup="dialog"
            />
          </HeaderActions>
        }
      >
        {!username && (
          <p style={{ fontSize: "0.875rem" }}>
            Place a bid to track your auctions here.
          </p>
        )}
        {username && entries.length === 0 && (
          <p style={{ fontSize: "0.875rem" }}>No tracked bids yet.</p>
        )}
        {entries.length > 0 && (
          <SidebarListScroll>
            <MyBidListItems entries={entries} />
          </SidebarListScroll>
        )}
      </SidebarCard>

      <Dialog
        header="My bids"
        visible={dialogOpen}
        onHide={closeDialog}
        modal
        dismissableMask
        style={{ width: "min(32rem, 92vw)" }}
        breakpoints={{ "960px": "92vw" }}
      >
        {entries.length === 0 ? (
          <p style={{ fontSize: "0.875rem" }}>No tracked bids yet.</p>
        ) : (
          <DialogListScroll>
            <MyBidListItems entries={entries} onNavigate={closeDialog} />
          </DialogListScroll>
        )}
      </Dialog>
    </>
  );
}
