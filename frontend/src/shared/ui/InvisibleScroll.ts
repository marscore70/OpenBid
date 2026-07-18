import styled from "styled-components";

/** Hides scrollbars while keeping overflow scroll/auto functional. */
export const invisibleScrollbarCss = `
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
`;

export const InvisibleScroll = styled.div`
  overflow: auto;
  min-height: 0;
  ${invisibleScrollbarCss}
`;
