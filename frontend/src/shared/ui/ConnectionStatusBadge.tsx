import styled from 'styled-components';
import type { SseConnectionStatus } from '../types/SseConnectionStatus';

const Badge = styled.span<{ $status: SseConnectionStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'connected'
      ? '#dcfce7'
      : $status === 'reconnecting'
        ? '#fef9c3'
        : '#fee2e2'};
  color: ${({ $status }) =>
    $status === 'connected'
      ? '#166534'
      : $status === 'reconnecting'
        ? '#854d0e'
        : '#991b1b'};
`;

const labels: Record<SseConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting',
};

export function ConnectionStatusBadge({ status }: { status: SseConnectionStatus }) {
  return <Badge $status={status}>{labels[status]}</Badge>;
}
