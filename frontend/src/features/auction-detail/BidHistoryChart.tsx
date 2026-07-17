import { Chart } from 'primereact/chart';
import { useMemo } from 'react';
import type { BidHistoryEntry } from '../../shared/types/BidHistoryEntry';
import { featureFlags } from '../../config/features';

type BidHistoryChartProps = {
  history: BidHistoryEntry[];
};

export function BidHistoryChart({ history }: BidHistoryChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    return {
      labels: sorted.map((entry) => new Date(entry.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: 'Bid price',
          data: sorted.map((entry) => entry.amount),
          fill: false,
          borderColor: '#2563eb',
          tension: 0.2,
        },
      ],
    };
  }, [history]);

  if (!featureFlags.bidHistoryChart) {
    return null;
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <div style={{ maxWidth: '640px', marginTop: '1rem' }}>
      <Chart type="line" data={chartData} />
    </div>
  );
}
