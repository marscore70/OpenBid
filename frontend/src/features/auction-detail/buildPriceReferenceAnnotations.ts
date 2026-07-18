import type { AnnotationOptions } from "chartjs-plugin-annotation";

export const START_PRICE_LINE_ID = "startPriceLine";
export const SOLD_PRICE_LINE_ID = "soldPriceLine";
export const START_PRICE_LINE_COLOR = "#94a3b8";
export const SOLD_PRICE_LINE_COLOR = "#16a34a";

export type PriceReferenceLinesInput = {
  startPrice: number;
  soldPrice: number | undefined;
};

export type PriceReferenceAnnotations = Record<string, AnnotationOptions>;

export function buildPriceReferenceAnnotations(
  input: PriceReferenceLinesInput,
): PriceReferenceAnnotations {
  const annotations: PriceReferenceAnnotations = {
    [START_PRICE_LINE_ID]: {
      type: "line",
      yMin: input.startPrice,
      yMax: input.startPrice,
      borderColor: START_PRICE_LINE_COLOR,
      borderWidth: 2,
      borderDash: [6, 4],
      label: {
        display: true,
        content: `Start $${input.startPrice}`,
        position: "start",
        backgroundColor: "rgba(148, 163, 184, 0.9)",
        color: "#0f172a",
        font: { size: 11 },
      },
    },
  };

  if (input.soldPrice === undefined) {
    return annotations;
  }

  annotations[SOLD_PRICE_LINE_ID] = {
    type: "line",
    yMin: input.soldPrice,
    yMax: input.soldPrice,
    borderColor: SOLD_PRICE_LINE_COLOR,
    borderWidth: 2,
    borderDash: [6, 4],
    label: {
      display: true,
      content: `Sold $${input.soldPrice}`,
      position: "end",
      backgroundColor: "rgba(22, 163, 74, 0.9)",
      color: "#ffffff",
      font: { size: 11 },
    },
  };

  return annotations;
}
