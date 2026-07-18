import styled, { createGlobalStyle, keyframes } from "styled-components";
import { Link } from "react-router-dom";
import { AuctionVisualStatus } from "../../shared/types/AuctionVisualStatus";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

export const GlobalAppStyles = createGlobalStyle`
  html,
  body,
  #root {
    height: 100%;
    margin: 0;
    overflow: hidden;
  }
`;

export const PageShell = styled.div`
  height: 100%;
  max-height: 100%;
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
  padding: 0.75rem 1.25rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
`;

export const BrandLink = styled(Link)`
  color: inherit;
  text-decoration: none;

  &:hover {
    color: #1e40af;
  }
`;

/** Wider My Bids on full page; narrows on smaller viewports - widths in vw/%. */
export const MainLayout = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18vw, 24%);
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  align-items: stretch;
  overflow: hidden;

  @media (max-width: 70em) {
    grid-template-columns: minmax(0, 1fr) minmax(14vw, 18%);
  }

  @media (max-width: 48em) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
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

  @media (max-width: 48em) {
    max-height: 18vh;
  }
`;

export const CatalogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 0.75rem;
`;

export const StatusStrip = styled.div<{ $status: AuctionVisualStatus }>`
  height: 0.25rem;
  border-radius: 0.25rem 0.25rem 0 0;
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

export const WinnerBanner = styled.div<{
  $tone?: "warning" | "success" | "neutral";
}>`
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  text-align: center;
  background: ${({ $tone }) =>
    $tone === "warning"
      ? "#fef9c3"
      : $tone === "success"
        ? "#dcfce7"
        : "#f1f5f9"};
  color: ${({ $tone }) =>
    $tone === "warning"
      ? "#854d0e"
      : $tone === "success"
        ? "#166534"
        : "#334155"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "warning"
        ? "#fde047"
        : $tone === "success"
          ? "#86efac"
          : "#e2e8f0"};
`;
