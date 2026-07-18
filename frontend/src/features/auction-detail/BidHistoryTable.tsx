import { memo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import type { BidHistoryEntry } from "../../shared/types/BidHistoryEntry";
import { formatBidTimestamp } from "../../shared/format/formatBidTimestamp";
import { DataTableFill } from "../../shared/ui/layoutPrimitives";

const HISTORY_SCROLL_HEIGHT = "calc(100vh - 11rem)";
const EMPTY_HISTORY_MESSAGE = "No bids yet";

type BidHistoryTableProps = {
  history: BidHistoryEntry[];
};

function BidHistoryTableComponent({ history }: BidHistoryTableProps) {
  return (
    <DataTableFill>
      <DataTable
        value={history}
        scrollable
        sortField="timestamp"
        sortOrder={-1}
        scrollHeight={HISTORY_SCROLL_HEIGHT}
        emptyMessage={EMPTY_HISTORY_MESSAGE}
        size="small"
      >
        <Column field="bidder" header="Bidder" />
        <Column
          field="amount"
          header="Amount"
          body={(row: BidHistoryEntry) => `$${row.amount}`}
        />
        <Column
          field="timestamp"
          header="Time"
          body={(row: BidHistoryEntry) => formatBidTimestamp(row.timestamp)}
        />
      </DataTable>
    </DataTableFill>
  );
}

export const BidHistoryTable = memo(BidHistoryTableComponent);
