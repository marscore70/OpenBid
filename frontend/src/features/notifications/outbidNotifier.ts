import type { NewBidEvent } from "../../shared/types/NewBidEvent";
import { featureFlags } from "../../config/features";
import {
  getMyLastBid,
  loadBidderName,
} from "../../shared/storage/bidderStorage";
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
  if (!featureFlags.outbidNotifications) {
    return;
  }
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

function notifyOutbid({ auctionId, title, amount }: OutbidNotifyParams): void {
  if (!featureFlags.outbidNotifications) {
    return;
  }
  const username = loadBidderName();
  if (!username) {
    return;
  }
  const myLast = getMyLastBid(auctionId);
  if (myLast === undefined) {
    return;
  }
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

export function shouldNotifyOutbid(
  event: NewBidEvent,
  username: string,
): boolean {
  if (!featureFlags.outbidNotifications || !username) {
    return false;
  }
  if (event.bidder === username) {
    return false;
  }
  const myLast = getMyLastBid(event.auctionId);
  return myLast !== undefined;
}
