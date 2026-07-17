import styled from "styled-components";
import {
  FlexColumn,
  GrowSection,
  PageSection,
  TextBackLink,
} from "../../shared/ui/layoutPrimitives";

export const LAYOUT_BREAKPOINT_PX = 960;

export const DetailPage = styled.div`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
`;

export const DetailLayout = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  overflow: hidden;

  @media (max-width: ${LAYOUT_BREAKPOINT_PX}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const DetailColumn = FlexColumn;
export const DetailSection = PageSection;
export const DetailChartSection = GrowSection;
export const DetailHistorySection = GrowSection;
export const DetailBackLink = TextBackLink;

export const AuctionHero = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex-shrink: 0;
`;

export const AuctionEmoji = styled.div`
  font-size: 3.5rem;
  line-height: 1;
  flex-shrink: 0;
`;

export const HeroMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;

  h1 {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.25;
  }

  p {
    margin: 0;
    color: #475569;
  }
`;

export const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;
