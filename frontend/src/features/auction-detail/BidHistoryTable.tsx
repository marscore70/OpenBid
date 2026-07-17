import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import type { BidHistoryEntry } from '../../shared/types/BidHistoryEntry';

type BidHistoryTableProps = {
  history: BidHistoryEntry[];
};

export function BidHistoryTable({ history }: BidHistoryTableProps) {
  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <DataTable
      value={sorted}
      scrollable
      scrollHeight="320px"
      virtualScrollerOptions={{ itemSize: 46 }}
      emptyMessage="No bids yet"
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
        body={(row: BidHistoryEntry) => new Date(row.timestamp).toLocaleTimeString()}
      />
    </DataTable>
  );
}
