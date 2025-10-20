export class MarkdownHelper {
  private static readonly FOOTER_ESTIMATED_LENGTH = 15;
  private static readonly CODE_BLOCK_MARKER = '```';
  private static readonly NEW_LINE = '\n';

  static splitMessageWithCodeAndPagination({
    text,
    maxPageLength = 2000,
  }: {
    text: string;
    maxPageLength?: number;
  }): string[] {
    const trimmedText = text.trim();
    const effectiveMaxLength = maxPageLength - this.FOOTER_ESTIMATED_LENGTH;
    const lines = trimmedText.split(/\r?\n/);

    const pages: string[] = [];
    let currentPage = '';
    let isInCodeBlock = false;
    let codeBlockLanguage = '';

    const pushPage = () => {
      if (!currentPage) return;
      pages.push(currentPage.trimEnd());
      currentPage = '';
    };

    const tryAppendLine = (line: string): boolean => {
      const lineToAdd = (currentPage ? this.NEW_LINE : '') + line;
      if (currentPage.length + lineToAdd.length <= effectiveMaxLength) {
        currentPage += lineToAdd;
        return true;
      }
      return false;
    };

    const hardWrapLine = (line: string, maxLength: number): string[] => {
      const out: string[] = [];
      let start = 0;
      while (start < line.length) {
        out.push(line.slice(start, start + maxLength));
        start += maxLength;
      }
      return out;
    };

    for (const line of lines) {
      const fenceMatch = line.match(/^```(\S*)\s*$/);

      if (fenceMatch) {
        if (!isInCodeBlock) {
          isInCodeBlock = true;
          codeBlockLanguage = fenceMatch[1] || '';
          if (!tryAppendLine(line)) {
            pushPage();
            currentPage = line;
          }
        } else {
          if (!tryAppendLine(line)) {
            if (!currentPage.endsWith(this.NEW_LINE + this.CODE_BLOCK_MARKER)) {
              currentPage += this.NEW_LINE + this.CODE_BLOCK_MARKER;
            }
            pushPage();
            const opener = this.CODE_BLOCK_MARKER + codeBlockLanguage;
            currentPage = opener;

            if (!tryAppendLine(line)) {
              pushPage();
              currentPage = line;
            }
          }
          isInCodeBlock = false;
          codeBlockLanguage = '';
        }
        continue;
      }

      if (line.length > effectiveMaxLength) {
        if (currentPage) pushPage();

        const parts = hardWrapLine(line, effectiveMaxLength);
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (isInCodeBlock) {
            const opener = this.CODE_BLOCK_MARKER + codeBlockLanguage;
            const closer = this.CODE_BLOCK_MARKER;
            const payload =
              opener + this.NEW_LINE + part + this.NEW_LINE + closer;

            if (payload.length <= effectiveMaxLength) {
              pages.push(payload);
            } else {
              pages.push(part);
            }
          } else {
            pages.push(part);
          }
        }
        continue;
      }

      if (!tryAppendLine(line)) {
        if (
          isInCodeBlock &&
          !currentPage.endsWith(this.NEW_LINE + this.CODE_BLOCK_MARKER)
        ) {
          currentPage += this.NEW_LINE + this.CODE_BLOCK_MARKER;
        }
        pushPage();

        if (isInCodeBlock) {
          currentPage = this.CODE_BLOCK_MARKER + codeBlockLanguage;
          if (!tryAppendLine(line)) {
            pushPage();
            currentPage = line;
          }
        } else {
          currentPage = line;
        }
      }
    }

    if (
      isInCodeBlock &&
      !currentPage.endsWith(this.NEW_LINE + this.CODE_BLOCK_MARKER)
    ) {
      currentPage += this.NEW_LINE + this.CODE_BLOCK_MARKER;
    }
    pushPage();

    return this.addPaginationFooters(pages, maxPageLength);
  }

  private static addPaginationFooters(
    pages: string[],
    maxPageLength: number,
  ): string[] {
    if (pages.length <= 1) {
      return pages;
    }

    const totalPages = pages.length;
    return pages.map((page, index) => {
      const separator = page.endsWith('\n\n')
        ? ''
        : page.endsWith('\n')
          ? '\n'
          : '\n\n';
      const footer = `${separator}*(${index + 1}/${totalPages})*`;

      if (page.length + footer.length <= maxPageLength) {
        return page + footer;
      } else {
        const availableSpace = maxPageLength - footer.length;
        if (availableSpace > 0) {
          return page.substring(0, availableSpace).trimEnd() + footer;
        } else {
          return page;
        }
      }
    });
  }
}
