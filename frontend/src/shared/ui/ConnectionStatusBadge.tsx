import styled from 'styled-components';
import { SseConnectionStatus } from '../types/SseConnectionStatus';

const Badge = styled.span<{ $status: SseConnectionStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === SseConnectionStatus.Connected
      ? '#dcfce7'
      : $status === SseConnectionStatus.Reconnecting
        ? '#fef9c3'
        : '#fee2e2'};
  color: ${({ $status }) =>
    $status === SseConnectionStatus.Connected
      ? '#166534'
      : $status === SseConnectionStatus.Reconnecting
        ? '#854d0e'
        : '#991b1b'};
`;

const labels: Record<SseConnectionStatus, string> = {
  [SseConnectionStatus.Connected]: 'Connected',
  [SseConnectionStatus.Disconnected]: 'Disconnected',
  [SseConnectionStatus.Reconnecting]: 'Reconnecting',
};

export function ConnectionStatusBadge({ status }: { status: SseConnectionStatus }) {
  return <Badge $status={status}>{labels[status]}</Badge>;
}
