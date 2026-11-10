import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import {
  WOW_FORUM_BASE,
  WowForumPost,
  WowForumSnapshot,
  WowSourceError,
} from '@Types/wow/wow.type';

const postSchema = z.object({
  id: z.number().int(),
  topic_id: z.number().int(),
  user_id: z.number().int(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }).optional(),
  cooked: z.string(),
  primary_group_name: z.string().nullable().optional(),
  staff: z.boolean().optional(),
  hidden: z.boolean().optional(),
  deleted_at: z.string().nullable().optional(),
  user_deleted: z.boolean().optional(),
  post_type: z.number().optional(),
  post_number: z.number().int(),
});
const streamSchema = z.object({
  title: z.string().optional(),
  post_stream: z.object({
    posts: z.array(postSchema),
    stream: z.array(z.number().int()).optional(),
  }),
});
const categorySchema = z.object({
  topic_list: z.object({
    more_topics_url: z.string().nullable().optional(),
    topics: z.array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        last_posted_at: z.iso.datetime({ offset: true }).nullable(),
        pinned: z.boolean(),
        visible: z.boolean().optional(),
      }),
    ),
  }),
});

export function forumText(html: string): string {
  return html
    .replace(
      /<aside\b[^>]*class=["'][^"']*quote[^"']*["'][^>]*>[\s\S]*?<\/aside>/gi,
      ' ',
    )
    .replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    })
    .replace(
      /&(nbsp|amp|quot|apos|lt|gt|#39);/gi,
      (entity) =>
        ({
          '&nbsp;': ' ',
          '&amp;': '&',
          '&quot;': '"',
          '&apos;': "'",
          '&#39;': "'",
          '&lt;': '<',
          '&gt;': '>',
        })[entity.toLowerCase()] ?? ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class WowForumService {
  constructor(private readonly http: HttpService) {}

  async read(trackedTopicIds: number[] = []): Promise<WowForumSnapshot> {
    const now = new Date();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    // Covers the active wave and the 15-minute reporting window. An outage of
    // this source is never interpreted as a quiet period by the monitor.
    const cutoff = now.getTime() - 15 * 60_000;
    const topics = new Map<number, string>(
      trackedTopicIds.map((id) => [id, 'WoW: Forever']),
    );
    try {
      let path: string | null = '/c/360.json';
      let pages = 0;
      while (path) {
        if (++pages > 10)
          throw new Error('Forum category pagination incomplete');
        const page = categorySchema.parse(
          await this.get(path, controller.signal),
        );
        const recent = page.topic_list.topics.filter(
          (t) =>
            t.visible !== false &&
            t.last_posted_at &&
            Date.parse(t.last_posted_at) >= cutoff,
        );
        for (const t of recent) {
          if (
            /(?:log|connect|queue|realm|server|character|disconnect|\bdc\b)/i.test(
              t.title,
            )
          )
            topics.set(t.id, t.title);
        }
        const regular = page.topic_list.topics.filter((t) => !t.pinned);
        const crossedCutoff =
          regular.length > 0 &&
          regular.every(
            (t) => t.last_posted_at && Date.parse(t.last_posted_at) < cutoff,
          );
        const more = page.topic_list.more_topics_url;
        if (crossedCutoff || !more) break;
        const url = new URL(more, WOW_FORUM_BASE);
        if (
          url.origin !== new URL(WOW_FORUM_BASE).origin ||
          !url.pathname.startsWith('/en/wow/c/')
        ) {
          throw new Error('Unexpected forum pagination URL');
        }
        path =
          url.pathname
            .replace(/^\/en\/wow/, '')
            .replace(/(?:\.json)?$/, '.json') + url.search;
      }
      if (topics.size > 100)
        throw new Error('Forum topic backlog exceeds polling budget');
      const posts: WowForumPost[] = [];
      for (const [id, title] of topics) {
        posts.push(
          ...(await this.topic(
            id,
            title,
            now.getTime() - 75 * 60_000,
            controller.signal,
          )),
        );
      }
      return { posts, checkedAt: now.toISOString() };
    } catch (error) {
      throw new WowSourceError(
        'The EU forum is unavailable or returned incomplete data.',
        false,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async topic(
    id: number,
    title: string,
    cutoff: number,
    signal: AbortSignal,
  ): Promise<WowForumPost[]> {
    const topic = streamSchema.parse(await this.get(`/t/${id}.json`, signal));
    const stream = topic.post_stream.stream;
    if (!stream?.length || new Set(stream).size !== stream.length)
      throw new Error('Missing or invalid forum post stream');
    const posts = new Map(topic.post_stream.posts.map((p) => [p.id, p]));
    let scanned = 0;
    for (let end = stream.length; end > 0; end -= 20) {
      if (++scanned > 50)
        throw new Error('Forum post backlog exceeds polling budget');
      const ids = stream.slice(Math.max(0, end - 20), end);
      const missing = ids.filter((postId) => !posts.has(postId));
      if (missing.length) {
        const query = new URLSearchParams();
        for (const postId of missing)
          query.append('post_ids[]', String(postId));
        const batch = streamSchema.parse(
          await this.get(`/t/${id}/posts.json?${query.toString()}`, signal),
        );
        for (const p of batch.post_stream.posts) posts.set(p.id, p);
        if (missing.some((postId) => !posts.has(postId)))
          throw new Error('Missing forum posts');
      }
      if (
        ids.every(
          (postId) => Date.parse(posts.get(postId)!.created_at) < cutoff,
        )
      )
        break;
    }
    const result: WowForumPost[] = [];
    for (const p of posts.values()) {
      if (p.topic_id !== id || !stream.includes(p.id))
        throw new Error('Forum returned an unrelated post');
      if (
        p.hidden ||
        p.deleted_at ||
        p.user_deleted ||
        (p.post_type ?? 1) !== 1 ||
        p.user_id <= 0
      )
        continue;
      result.push({
        id: p.id,
        topicId: id,
        authorId: p.user_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        title: topic.title ?? title,
        text: forumText(p.cooked),
        url: `${WOW_FORUM_BASE}/t/${id}/${p.post_number}`,
        staff:
          p.staff === true &&
          ['cs-tech', 'cs-support-sse', 'community-manager'].includes(
            p.primary_group_name ?? '',
          ),
      });
    }
    return result;
  }

  private async get(path: string, signal: AbortSignal): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      signal.throwIfAborted();
      try {
        const response = await firstValueFrom(
          this.http.get<unknown>(`${WOW_FORUM_BASE}${path}`, { signal }),
        );
        return response.data;
      } catch (error) {
        const retryable =
          isAxiosError(error) &&
          (error.code === 'ECONNABORTED' ||
            (error.response?.status ?? 0) >= 500);
        if (attempt > 0 || !retryable) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
}
