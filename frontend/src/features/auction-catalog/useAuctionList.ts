import { useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  auctionsListAtom,
  fetchAuctionsList,
} from "../../state/auctionsListAtom";
import { LoadStatus } from "../../state/LoadStatus";

function useAuctionListState() {
  const state = useAtomValue(auctionsListAtom);
  const hasData = state.data.length > 0;

  return {
    data: state.data,
    status: state.status,
    isLoading:
      state.status === LoadStatus.Idle ||
      (state.status === LoadStatus.Loading && !hasData),
    isError: state.status === LoadStatus.Error,
    error:
      state.status === LoadStatus.Error
        ? new Error(state.errorMessage)
        : null,
    // Non-destructive: a background refetch failure keeps `status` at
    // Success (and `data` intact) but still surfaces `errorMessage` so the
    // UI can show an inline warning instead of losing the catalog.
    backgroundErrorMessage:
      state.status === LoadStatus.Success && hasData ? state.errorMessage : "",
    refetch: () => fetchAuctionsList(),
  };
}

/**
 * Read-only catalog subscription (no idle fetch). Use on pages that share
 * AppShell's warm load so StrictMode / sibling mounts cannot double-fetch.
 */
export function useAuctionListReader() {
  return useAuctionListState();
}

/** Subscribes and starts an idle fetch — keep a single caller (AppShell warm). */
export function useAuctionList() {
  const list = useAuctionListState();

  useEffect(() => {
    if (list.status === LoadStatus.Idle) {
      void fetchAuctionsList();
    }
  }, [list.status]);

  return list;
}
