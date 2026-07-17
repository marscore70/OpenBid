import type { AxiosInstance } from "axios";
import { apiClient, HttpError, isHttpError } from "./httpClient";

export type PlaceBidPayload = {
  auctionId: string;
  bidder: string;
  amount: number;
};

export type PlaceBidSuccess = {
  success: true;
  bid_id: string;
  currentBid: number;
  message: string;
};

export type PlaceBidErrorBody = {
  error?: string;
  currentBid?: number;
  winner?: string | null;
  finalPrice?: number;
};

export class BidService {
  constructor(private readonly client: AxiosInstance) {}

  async placeBid(payload: PlaceBidPayload): Promise<PlaceBidSuccess> {
    const { data } = await this.client.post<PlaceBidSuccess>(
      "/api/bid",
      payload,
    );
    return data;
  }
}

export const bidService = new BidService(apiClient);

export function isPlaceBidHttpError(error: unknown): error is HttpError {
  return isHttpError(error);
}
