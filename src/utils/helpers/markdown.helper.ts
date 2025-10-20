export class MarkdownHelper {
  private static readonly FOOTER_ESTIMATED_LENGTH = 15; // Ex. "\n\n*(99/99)*"
  private static readonly CODE_BLOCK_MARKER = '```';

  static splitMessageWithCodeAndPagination({
    text,
    maxPageLength = 2000,
  }: {
    text: string;
    maxPageLength?: number;
  }): string[] {
    const trimmedText = text.trim();

    if (trimmedText.length <= maxPageLength) {
      return [trimmedText];
    }

    const pages: string[] = [];
    let currentIndex = 0;
    const effectiveMaxLength = maxPageLength - this.FOOTER_ESTIMATED_LENGTH;

    while (currentIndex < trimmedText.length) {
      const idealEndIndex = Math.min(
        currentIndex + maxPageLength,
        trimmedText.length,
      );
      const maxAllowedIndex = Math.min(
        currentIndex + effectiveMaxLength,
        trimmedText.length,
      );

      const finalEndIndex = this.findOptimalSplitIndex({
        text: trimmedText,
        startIndex: currentIndex,
        maxAllowedIndex: maxAllowedIndex,
        idealEndIndex: idealEndIndex,
      });

      const pageContent = trimmedText
        .substring(currentIndex, finalEndIndex)
        .trim();
      if (pageContent) {
        pages.push(pageContent);
      }

      currentIndex = finalEndIndex;
    }

    return this.addPaginationFooters(pages);
  }

  private static findOptimalSplitIndex({
    text,
    startIndex,
    maxAllowedIndex,
    idealEndIndex,
  }: {
    text: string;
    startIndex: number;
    maxAllowedIndex: number;
    idealEndIndex: number;
  }): number {
    const codeBlockCheckResult = this.checkIfInsideCodeBlock({
      text,
      startIndex,
      checkIndex: maxAllowedIndex,
    });

    if (
      codeBlockCheckResult.inside &&
      codeBlockCheckResult.blockStartIndex !== undefined
    ) {
      if (codeBlockCheckResult.blockStartIndex > startIndex) {
        return this.findNaturalBreakPoint({
          text,
          startIndex,
          endIndex: codeBlockCheckResult.blockStartIndex,
        });
      } else {
        const blockEndIndex = text.indexOf(
          this.CODE_BLOCK_MARKER,
          codeBlockCheckResult.blockStartIndex + 3,
        );
        if (blockEndIndex !== -1) {
          const trueBlockEnd = blockEndIndex + 3;
          return Math.min(trueBlockEnd, idealEndIndex);
        } else {
          return idealEndIndex;
        }
      }
    } else {
      return this.findNaturalBreakPoint({
        text,
        startIndex,
        endIndex: maxAllowedIndex,
      });
    }
  }

  private static checkIfInsideCodeBlock({
    text,
    startIndex,
    checkIndex,
  }: {
    text: string;
    startIndex: number;
    checkIndex: number;
  }): { inside: boolean; blockStartIndex?: number } {
    let markerIndex = text.indexOf(this.CODE_BLOCK_MARKER, startIndex);
    let markersPassed = 0;
    let lastMarkerIndex = -1;

    while (markerIndex !== -1 && markerIndex < checkIndex) {
      markersPassed++;
      lastMarkerIndex = markerIndex;
      markerIndex = text.indexOf(this.CODE_BLOCK_MARKER, markerIndex + 3);
    }

    const inside = markersPassed % 2 === 1;
    return { inside, blockStartIndex: inside ? lastMarkerIndex : undefined };
  }

  private static adjustEndIndexForCodeBlocks({
    text,
    startIndex,
    potentialEndIndex,
    maxPageLength,
  }: {
    text: string;
    startIndex: number;
    potentialEndIndex: number;
    maxPageLength: number;
  }): number {
    const chunkToCheck = text.substring(startIndex, potentialEndIndex);
    const lastCodeBlockStartInChunk = chunkToCheck.lastIndexOf(
      this.CODE_BLOCK_MARKER,
    );

    if (lastCodeBlockStartInChunk === -1) {
      return potentialEndIndex;
    }

    const absoluteCodeBlockStartIndex = startIndex + lastCodeBlockStartInChunk;
    const codeBlockMarkersBefore = (
      text.substring(0, absoluteCodeBlockStartIndex).match(/```/g) || []
    ).length;
    const isStartOfCodeBlock = codeBlockMarkersBefore % 2 === 0;

    if (!isStartOfCodeBlock) {
      return potentialEndIndex;
    }

    const codeBlockEndIndex = text.indexOf(
      this.CODE_BLOCK_MARKER,
      absoluteCodeBlockStartIndex + 3,
    );

    if (codeBlockEndIndex === -1 || codeBlockEndIndex + 3 > potentialEndIndex) {
      if (absoluteCodeBlockStartIndex > startIndex) {
        return absoluteCodeBlockStartIndex;
      } else {
        if (codeBlockEndIndex !== -1) {
          return Math.min(
            codeBlockEndIndex + 3,
            startIndex + maxPageLength,
            text.length,
          );
        } else {
          return Math.min(startIndex + maxPageLength, text.length);
        }
      }
    }

    return potentialEndIndex;
  }

  private static findNaturalBreakPoint({
    text,
    startIndex,
    endIndex,
  }: {
    text: string;
    startIndex: number;
    endIndex: number;
  }): number {
    for (let i = endIndex - 1; i > startIndex; i--) {
      const char = text[i];
      if (char === '\n') {
        return i + 1;
      }
      if (char === ' ') {
        const lineStart = text.lastIndexOf('\n', i) + 1;
        if (!text.substring(lineStart, i).includes(this.CODE_BLOCK_MARKER)) {
          return i + 1;
        }
      }
    }

    return endIndex;
  }

  private static addPaginationFooters(pages: string[]): string[] {
    if (pages.length <= 1) {
      return pages;
    }

    const totalPages = pages.length;
    return pages.map((page, index) => {
      const separator = page.endsWith('\n') ? '\n' : '\n\n';
      const footer = `${separator}*(${index + 1}/${totalPages})*`;
      return page + footer;
    });
  }
}
