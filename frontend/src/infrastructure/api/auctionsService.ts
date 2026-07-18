import type { AxiosInstance } from "axios";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import { logger } from "../../shared/logging/logger";
import { apiClient } from "./httpClient";
import { auctionDetailSchema, auctionSummaryListSchema } from "./auctionSchemas";

export class AuctionsService {
  constructor(private readonly client: AxiosInstance) {}

  async getAll(): Promise<AuctionSummary[]> {
    const { data } = await this.client.get<unknown>("/api/auctions");
    const result = auctionSummaryListSchema.safeParse(data);
    if (!result.success) {
      logger.error("Invalid auctions list payload", {
        issues: result.error.issues,
      });
      throw new Error("Invalid auctions response");
    }
    return result.data;
  }

  async getById(id: string): Promise<AuctionDetail> {
    const { data } = await this.client.get<unknown>(
      `/api/auctions/${encodeURIComponent(id)}`,
    );
    const result = auctionDetailSchema.safeParse(data);
    if (!result.success) {
      logger.error("Invalid auction detail payload", {
        auctionId: id,
        issues: result.error.issues,
      });
      throw new Error("Invalid auction detail response");
    }
    return result.data;
  }
}

export const auctionsService = new AuctionsService(apiClient);
