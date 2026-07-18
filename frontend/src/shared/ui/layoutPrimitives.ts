import styled from "styled-components";
import { Link } from "react-router-dom";

export const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

export const PageSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 1rem;
    color: #334155;
  }
`;

export const GrowSection = styled(PageSection)`
  flex: 1;
  flex-shrink: 1;
  min-height: 0;
`;

export const ScrollPane = styled.div`
  height: 100%;
  min-height: 0;
  overflow: auto;
`;

export const TextBackLink = styled(Link)`
  flex-shrink: 0;
  width: fit-content;
  color: #475569;
  text-decoration: none;
  font-size: 0.875rem;

  &:hover {
    color: #0f172a;
  }
`;

/** Flex host for PrimeReact DataTable with internal scroll. */
export const DataTableFill = styled.div`
  flex: 1;
  min-height: 160px;
  height: 100%;
  display: flex;
  flex-direction: column;

  .p-datatable {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .p-datatable-wrapper {
    overflow: auto;
  }
`;
