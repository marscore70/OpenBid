import styled, { keyframes } from "styled-components";
import { AuctionVisualStatus } from "../../shared/types/AuctionVisualStatus";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

export const PageShell = styled.div`
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  color: #0f172a;
`;

export const AppHeader = styled.header`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
`;

export const MainLayout = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  align-items: stretch;
  overflow: hidden;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    overflow: auto;
  }
`;

export const ContentColumn = styled.main`
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  > * {
    flex: 1;
    min-height: 0;
  }
`;

export const SidebarColumn = styled.aside`
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  align-self: stretch;
`;

export const CatalogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
`;

export const StatusStrip = styled.div<{ $status: AuctionVisualStatus }>`
  height: 4px;
  border-radius: 4px 4px 0 0;
  background: ${({ $status }) =>
    $status === AuctionVisualStatus.Active
      ? "#22c55e"
      : $status === AuctionVisualStatus.Urgent
        ? "#ef4444"
        : "#94a3b8"};
  animation: ${({ $status }) =>
      $status === AuctionVisualStatus.Urgent ? pulse : "none"}
    1s ease-in-out infinite;
`;

export const CardMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const WinnerBanner = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: #f1f5f9;
  font-size: 0.875rem;
`;
