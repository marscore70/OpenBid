import type { NewBidEvent } from '../../shared/types/NewBidEvent';
import { featureFlags } from '../../config/features';
import { getMyLastBid } from '../../shared/storage/bidderStorage';

export type OutbidNotifier = {
  notifyOutbid: (params: { auctionId: string; title: string; amount: number }) => void;
  enableSound: () => void;
};

let audioContext: AudioContext | null = null;

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

export function createOutbidNotifier(
  showToast: (detail: string) => void,
  getAuctionTitle: (auctionId: string) => string | undefined,
  getUsername: () => string,
): OutbidNotifier {
  return {
    enableSound: () => {
      if (!featureFlags.outbidNotifications) {
        return;
      }
      try {
        audioContext = new AudioContext();
      } catch {
        audioContext = null;
      }
    },
    notifyOutbid: ({ auctionId, title, amount }) => {
      if (!featureFlags.outbidNotifications) {
        return;
      }
      const username = getUsername();
      if (!username) {
        return;
      }
      const myLast = getMyLastBid(auctionId);
      if (myLast === undefined) {
        return;
      }
      const resolvedTitle = getAuctionTitle(auctionId) ?? title;
      showToast(`Outbid on ${resolvedTitle}! New high bid: $${amount}`);
      playBeep();
    },
  };
}

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
