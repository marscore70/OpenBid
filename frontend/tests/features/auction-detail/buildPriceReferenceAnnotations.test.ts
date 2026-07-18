import { describe, expect, it } from "vitest";
import {
  buildPriceReferenceAnnotations,
  SOLD_PRICE_LINE_ID,
  START_PRICE_LINE_ID,
} from "../../../src/features/auction-detail/buildPriceReferenceAnnotations";

describe("buildPriceReferenceAnnotations", () => {
  it("always includes the start price line", () => {
    const annotations = buildPriceReferenceAnnotations({
      startPrice: 50,
      soldPrice: undefined,
    });

    expect(annotations[START_PRICE_LINE_ID]).toMatchObject({
      type: "line",
      yMin: 50,
      yMax: 50,
    });
    expect(annotations[SOLD_PRICE_LINE_ID]).toBeUndefined();
  });

  it("adds the sold price line only when soldPrice is provided", () => {
    const annotations = buildPriceReferenceAnnotations({
      startPrice: 50,
      soldPrice: 180,
    });

    expect(annotations[START_PRICE_LINE_ID]).toBeDefined();
    expect(annotations[SOLD_PRICE_LINE_ID]).toMatchObject({
      type: "line",
      yMin: 180,
      yMax: 180,
    });
  });
});
