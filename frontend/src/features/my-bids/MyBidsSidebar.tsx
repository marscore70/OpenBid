import { useState } from "react";
import { useAtomValue } from "jotai";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { featureFlags } from "../../config/features";
import { useAuctionList } from "../auction-catalog/useAuctionList";
import { collectMyBidEntries } from "./collectMyBidEntries";
import type { MyBidEntry } from "./MyBidEntry";
import {
  bidderStorageVersionAtom,
  loadBidderName,
} from "../../shared/storage/bidderStorage";
import { MyBidStatus } from "../../shared/types/MyBidStatus";
import { InvisibleScroll } from "../../shared/ui/InvisibleScroll";

const SidebarCard = styled(Card)`
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;

  .p-card-body {
    padding: 4%;
  }

  .p-card-title {
    font-size: 1.05rem;
  }

  .p-card-body,
  .p-card-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  @media (max-width: 70em) {
    .p-card-body {
      padding: 3%;
    }

    .p-card-title {
      font-size: 0.9rem;
    }
  }
`;

const SidebarListScroll = styled(InvisibleScroll)`
  flex: 1;
  min-height: 0;
  font-size: 0.9rem;

  a {
    font-size: inherit;
    line-height: 1.3;
  }

  @media (max-width: 70em) {
    font-size: 0.8rem;
  }
`;

const DialogListScroll = styled(InvisibleScroll)`
  max-height: 70vh;
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

type BidStatusSeverity = "success" | "warning" | "info" | "danger";

/** Exhaustive by construction: `Record<MyBidStatus, …>` fails to compile if a status is ever added without a mapping here. */
const severityByStatus: Record<MyBidStatus, BidStatusSeverity> = {
  [MyBidStatus.Winning]: "success",
  [MyBidStatus.Outbid]: "warning",
  [MyBidStatus.Won]: "success",
  [MyBidStatus.Lost]: "danger",
  [MyBidStatus.Stale]: "warning",
};

const labelByStatus: Record<MyBidStatus, string> = {
  [MyBidStatus.Winning]: "Winning",
  [MyBidStatus.Outbid]: "Outbid",
  [MyBidStatus.Won]: "Won",
  [MyBidStatus.Lost]: "Lost",
  [MyBidStatus.Stale]: "Stale",
};

function severityForStatus(status: MyBidEntry["status"]): BidStatusSeverity {
  return severityByStatus[status];
}

function labelForStatus(status: MyBidEntry["status"]): string {
  return labelByStatus[status];
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
              value={labelForStatus(entry.status)}
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

export function MyBidsSidebar() {
  const { data, status } = useAuctionList();
  const storageVersion = useAtomValue(bidderStorageVersionAtom);
  void storageVersion;
  const username = loadBidderName();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!featureFlags.myBidsTracker) {
    return null;
  }

  const entries = collectMyBidEntries(status, data, username);
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
