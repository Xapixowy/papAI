import { DomUtils, parseDocument } from 'htmlparser2';
import { WowPatchNotesBlock } from '@Types/wow/wow-patch-notes.type';

/** Kept stable for revision hashes already stored by the monitor. */
export function patchNotesText(html: string): string {
  const entities: Record<string, string> = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    ndash: '–',
    mdash: '—',
    rsquo: '’',
    lsquo: '‘',
    rdquo: '”',
    ldquo: '“',
    hellip: '…',
    shy: '',
    times: '×',
  };
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(
      /<br\s*\/?\s*>|<\/(?:p|h[1-6]|li|ul|ol|div|blockquote|tr)>/gi,
      '\n',
    )
    .replace(/<[^>]*>/g, '')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const n =
        code[0].toLowerCase() === 'x'
          ? Number.parseInt(code.slice(1), 16)
          : Number(code);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
        ? String.fromCodePoint(n)
        : ' ';
    })
    .replace(
      /&([a-z]+);/gi,
      (entity, name: string) => entities[name.toLowerCase()] ?? entity,
    )
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

type HtmlNode = ReturnType<typeof parseDocument>['children'][number];

/** Preserve source order and the context of nested class/specification lists. */
export function patchNotesBlocks(html: string): WowPatchNotesBlock[] {
  const document = parseDocument(html);
  const blocks: WowPatchNotesBlock[] = [];
  const text = (nodes: HtmlNode[]) =>
    patchNotesText(
      DomUtils.getOuterHTML(nodes).replace(
        /<(?:p|h[1-6]|div|blockquote|table)\b[^>]*>/gi,
        '\n$&',
      ),
    );
  const list = (node: HtmlNode) =>
    DomUtils.isTag(node) && /^(ul|ol)$/.test(node.name);
  const ignored = (node: HtmlNode) =>
    DomUtils.isTag(node) && /^(script|style)$/.test(node.name);

  const walkList = (node: HtmlNode, path: string[]) => {
    if (!DomUtils.hasChildren(node)) return;
    for (const child of node.children) {
      if (!DomUtils.isTag(child) || child.name !== 'li') continue;
      let pending: HtmlNode[] = [];
      let parent = '';
      const flush = (hasChildren: boolean) => {
        const value = text(pending);
        pending = [];
        if (!value) return;
        if (hasChildren && !parent) parent = value;
        else
          blocks.push({
            path: parent ? [...path, parent] : path,
            text: value,
            bullet: true,
          });
      };
      for (const part of child.children) {
        if (list(part)) {
          flush(true);
          walkList(part, parent ? [...path, parent] : path);
        } else if (!ignored(part)) pending.push(part);
      }
      flush(false);
    }
  };

  const walk = (nodes: HtmlNode[], inherited: string[]) => {
    let path = inherited;
    let pending: HtmlNode[] = [];
    const flush = () => {
      const value = text(pending);
      if (value) blocks.push({ path, text: value, bullet: false });
      pending = [];
    };
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (ignored(node)) continue;
      if (list(node)) {
        flush();
        walkList(node, path);
      } else if (DomUtils.isTag(node) && /^(h[1-6]|p)$/.test(node.name)) {
        flush();
        const value = text([node]);
        const following = nodes
          .slice(i + 1)
          .find((n) => DomUtils.isTag(n) || text([n]));
        const heading =
          node.name !== 'p' ||
          (value.length <= 120 && following && list(following));
        if (value && heading) path = [...inherited, value];
        else if (value) blocks.push({ path, text: value, bullet: false });
      } else if (
        DomUtils.isTag(node) &&
        /^(div|section|article)$/.test(node.name)
      ) {
        flush();
        walk(node.children, path);
      } else pending.push(node);
    }
    flush();
  };
  walk(document.children, []);
  return blocks;
}
