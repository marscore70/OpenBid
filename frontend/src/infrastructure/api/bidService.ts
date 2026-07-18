import type { AxiosInstance } from "axios";
import { apiClient } from "./httpClient";
import { placeBidSuccessSchema, type PlaceBidSuccess } from "./bidSchemas";

export type { PlaceBidSuccess } from "./bidSchemas";

export type PlaceBidPayload = {
  auctionId: string;
  bidder: string;
  amount: number;
};

/** Thrown when POST /api/bid returns 200 with a body that fails Zod validation. */
export class InvalidBidResponseError extends Error {
  readonly name = "InvalidBidResponseError";

  constructor() {
    super("Place-bid response failed validation");
  }
}

export class BidService {
  constructor(private readonly client: AxiosInstance) {}

  async placeBid(payload: PlaceBidPayload): Promise<PlaceBidSuccess> {
    const { data } = await this.client.post<unknown>("/api/bid", payload);
    const parsed = placeBidSuccessSchema.safeParse(data);
    if (!parsed.success) {
      throw new InvalidBidResponseError();
    }
    return parsed.data;
  }
}

export const bidService = new BidService(apiClient);
