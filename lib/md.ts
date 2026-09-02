import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export async function renderMarkdown(md: string): Promise<string> {
  const result = await processor.process(md);
  return result.toString();
}

export interface Heading {
  id: string;
  text: string;
  depth: number;
}

export function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = [];
  const re = /<h([23]) id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    headings.push({
      depth: Number(m[1]),
      id: m[2],
      text: m[3].replace(/<[^>]+>/g, '').trim(),
    });
  }
  return headings;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 直接从 Markdown 源码提取纯文本（搜索索引用，比先渲染 HTML 再剥标签便宜得多） */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // 代码块
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`([^`]*)`/g, '$1') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/<[^>]+>/g, ' ') // HTML 标签
    .replace(/^#{1,6}\s+/gm, '') // 标题记号
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '') // 列表记号
    .replace(/^\s*>\s?/gm, '') // 引用
    .replace(/\|/g, ' ') // 表格
    .replace(/[*_~]{1,3}/g, '') // 强调记号
    .replace(/\s+/g, ' ')
    .trim();
}
