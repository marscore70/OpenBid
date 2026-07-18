import { Provider } from "jotai";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { Toast } from "primereact/toast";
import { useEffect, useRef } from "react";
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primeicons/primeicons.css";
import { BidStreamProvider, useBidStream } from "./BidStreamProvider";
import { AuctionCatalogPage } from "../features/auction-catalog/AuctionCatalogPage";
import { AuctionDetailPage } from "../features/auction-detail/AuctionDetailPage";
import { MyBidsSidebar } from "../features/my-bids/MyBidsSidebar";
import { ConnectionStatusBadge } from "../shared/ui/ConnectionStatusBadge";
import {
  AppHeader,
  ContentColumn,
  MainLayout,
  PageShell,
  SidebarColumn,
} from "../shared/ui/layout";
import { featureFlags } from "../config/features";
import { outbidNotifier } from "../features/notifications/outbidNotifier";
import { auctionStore } from "../state/auctionStore";

function AppShell() {
  const toastRef = useRef<Toast>(null);
  const { connectionStatus, retryConnection } = useBidStream();

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
      <Toast ref={toastRef} />
      <AppHeader>
        <div>
          <strong>BidBlitz</strong>
          <span style={{ marginLeft: "0.5rem", color: "#64748b" }}>
            Live garage auctions
          </span>
        </div>
        <ConnectionStatusBadge
          status={connectionStatus}
          onRetry={retryConnection}
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
