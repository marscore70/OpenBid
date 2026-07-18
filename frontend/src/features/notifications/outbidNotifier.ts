import type { NewBidEvent } from "../../shared/types/NewBidEvent";
import { isSameBidderIdentity } from "../../domain/bid/sanitizeBidderName";
import { findAuctionTitleInList } from "../../state/auctionsListAtom";

export type OutbidToastListener = (detail: string) => void;

export type OutbidNotifyParams = {
  auctionId: string;
  title: string;
  amount: number;
};

export type OutbidNotifier = {
  subscribe: (listener: OutbidToastListener) => () => void;
  notifyOutbid: (params: OutbidNotifyParams) => void;
  enableSound: () => void;
};

let audioContext: AudioContext | null = null;

const toastListeners = new Set<OutbidToastListener>();

function emitOutbidToast(detail: string): void {
  for (const listener of toastListeners) {
    listener(detail);
  }
}

function playBeep(): void {
  try {
    if (!audioContext) {
      return;
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 440;
    gain.gain.value = 0.05;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    /* ignore audio failures */
  }
}

function enableSound(): void {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
  } catch {
    audioContext = null;
  }
}

/** Side effect only — caller must already have passed `shouldNotifyOutbid`. */
function notifyOutbid({ auctionId, title, amount }: OutbidNotifyParams): void {
  const resolvedTitle = findAuctionTitleInList(auctionId) || title;
  emitOutbidToast(`Outbid on ${resolvedTitle}! New high bid: $${amount}`);
  playBeep();
}

function subscribe(listener: OutbidToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

/** Module-level singleton: UI subscribes for toasts; SSE path calls notifyOutbid. */
export const outbidNotifier: OutbidNotifier = {
  subscribe,
  notifyOutbid,
  enableSound,
};

/**
 * True when a foreign bid displaces the local user as current leader.
 * `previousLeader` is the cached `currentBidder` before the merge.
 */
export function shouldNotifyOutbid(
  event: NewBidEvent,
  username: string,
  previousLeader: string | null,
): boolean {
  if (!username) {
    return false;
  }
  if (isSameBidderIdentity(event.bidder, username)) {
    return false;
  }
  return isSameBidderIdentity(previousLeader, username);
}
