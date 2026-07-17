import { getApiBaseUrl } from '../../config/env';
import { logger } from '../../shared/logging/logger';
import type { SseConnectionStatus } from '../../shared/types/SseConnectionStatus';
import { parseSseData, type ParsedStreamEvent } from './parseSseMessage';

export type StreamListener = (event: ParsedStreamEvent) => void;
export type StatusListener = (status: SseConnectionStatus) => void;

const MIN_RECONNECT_MS = 500;
const MAX_RECONNECT_MS = 8000;

export class BidStreamService {
  private source: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private listeners = new Set<StreamListener>();
  private statusListeners = new Set<StatusListener>();
  private intentionalClose = false;

  subscribe(listener: StreamListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  start(): void {
    this.intentionalClose = false;
    this.connect();
  }

  stop(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.source?.close();
    this.source = null;
    this.setStatus('disconnected');
  }

  private setStatus(status: SseConnectionStatus): void {
    this.statusListeners.forEach((listener) => listener(status));
  }

  private emit(event: ParsedStreamEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private connect(): void {
    if (this.intentionalClose) {
      return;
    }
    this.source?.close();
    const url = `${getApiBaseUrl()}/api/stream`;
    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connected');
    logger.info('SSE connecting', { url, attempt: this.reconnectAttempt });

    const source = new EventSource(url);
    this.source = source;

    source.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.setStatus('connected');
      logger.info('SSE connected');
    });

    const handleNamed = (event: Event): void => {
      const message = event as MessageEvent<string>;
      const eventName = event.type === 'message' ? undefined : event.type;
      const parsed = parseSseData(eventName, message.data);
      if (parsed) {
        this.emit(parsed);
      }
    };

    source.addEventListener('connected', handleNamed);
    source.addEventListener('new_bid', handleNamed);
    source.addEventListener('auction_ended', handleNamed);
    source.addEventListener('heartbeat', () => {
      /* QUIRK 5: ignored */
    });

    source.onerror = () => {
      logger.warn('SSE error or disconnect');
      source.close();
      this.source = null;
      if (this.intentionalClose) {
        this.setStatus('disconnected');
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting');
    const delay = Math.min(
      MAX_RECONNECT_MS,
      MIN_RECONNECT_MS * 2 ** this.reconnectAttempt,
    );
    this.reconnectAttempt += 1;
    logger.info('SSE scheduling reconnect', { delayMs: delay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

export const bidStreamService = new BidStreamService();
