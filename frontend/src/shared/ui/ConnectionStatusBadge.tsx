import styled from 'styled-components';
import { SseConnectionStatus } from '../types/SseConnectionStatus';

const StatusRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
`;

const RetryButton = styled.button`
  border: none;
  background: transparent;
  color: #991b1b;
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
`;

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
  // "Offline" (rather than the more technical "Disconnected") makes the
  // recovery-needed state unambiguous at a glance; paired with a Retry
  // action below once the service has given up auto-reconnecting.
  [SseConnectionStatus.Disconnected]: 'Offline',
  [SseConnectionStatus.Reconnecting]: 'Reconnecting',
};

type ConnectionStatusBadgeProps = {
  status: SseConnectionStatus;
  /** Provided once the SSE service has permanently given up; omit to hide the Retry action. */
  onRetry?: () => void;
};

export function ConnectionStatusBadge({ status, onRetry }: ConnectionStatusBadgeProps) {
  return (
    <StatusRow>
      <Badge $status={status}>{labels[status]}</Badge>
      {status === SseConnectionStatus.Disconnected && onRetry && (
        <RetryButton type="button" onClick={onRetry}>
          Retry
        </RetryButton>
      )}
    </StatusRow>
  );
}
