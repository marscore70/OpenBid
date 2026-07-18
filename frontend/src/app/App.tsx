import { Provider } from "jotai";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { Toast } from "primereact/toast";
import { useEffect, useRef } from "react";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primeicons/primeicons.css";
import {
  BidStreamProvider,
  useBidStreamConnectionStatus,
  retryBidStreamConnection,
} from "./BidStreamProvider";
import { AuctionCatalogPage } from "../features/auction-catalog/AuctionCatalogPage";
import { AuctionDetailPage } from "../features/auction-detail/AuctionDetailPage";
import { MyBidsSidebar } from "../features/my-bids/MyBidsSidebar";
import { useAuctionList } from "../features/auction-catalog/useAuctionList";
import { ConnectionStatusBadge } from "../shared/ui/ConnectionStatusBadge";
import {
  AppHeader,
  BrandLink,
  ContentColumn,
  GlobalAppStyles,
  MainLayout,
  PageShell,
  SidebarColumn,
} from "../shared/ui/layout";
import { featureFlags } from "../config/features";
import { outbidNotifier } from "../features/notifications/outbidNotifier";
import { auctionStore } from "../state/auctionStore";

function AppShell() {
  const toastRef = useRef<Toast>(null);
  const connectionStatus = useBidStreamConnectionStatus();
  // Warm catalog for deep-links when My Bids sidebar is off (#18).
  useAuctionList();

  useEffect(() => {
    return outbidNotifier.subscribe((detail) => {
      toastRef.current?.show({
        severity: "warn",
        summary: "Outbid",
        detail,
        life: 5000,
      });
    });
  }, []);

  return (
    <PageShell>
      <GlobalAppStyles />
      <Toast ref={toastRef} />
      <AppHeader>
        <div>
          <BrandLink to="/" aria-label="BidBlitz home">
            <strong>BidBlitz</strong>
          </BrandLink>
          <span style={{ marginLeft: "0.5rem", color: "#64748b" }}>
            Live garage auctions
          </span>
        </div>
        <ConnectionStatusBadge
          status={connectionStatus}
          onRetry={retryBidStreamConnection}
        />
      </AppHeader>
      <MainLayout>
        <ContentColumn>
          <Routes>
            <Route path="/" element={<AuctionCatalogPage />} />
            <Route path="/auctions/:id" element={<AuctionDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ContentColumn>
        {featureFlags.myBidsTracker && (
          <SidebarColumn>
            <MyBidsSidebar />
          </SidebarColumn>
        )}
      </MainLayout>
    </PageShell>
  );
}

export function App() {
  return (
    <PrimeReactProvider>
      <Provider store={auctionStore}>
        <BidStreamProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </BidStreamProvider>
      </Provider>
    </PrimeReactProvider>
  );
}
