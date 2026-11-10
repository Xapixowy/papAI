import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { WowForumService } from '@Services/wow/wow-forum.service';

afterEach(() => jest.useRealTimers());

describe('Public forum reads', () => {
  it('follows category pages and reads reports and staff replies beyond the first 20 posts', async () => {
    const now = new Date('2026-11-09T18:00:00Z');
    jest.useFakeTimers().setSystemTime(now);
    const calls: string[] = [];
    const makePost = (id: number) => ({
      id,
      topic_id: 42,
      user_id: id,
      post_number: id,
      created_at: new Date(
        now.getTime() - (id <= 20 ? 90 : 5) * 60_000,
      ).toISOString(),
      cooked: '<p>Cannot log in EU</p>',
      staff: id === 25,
      primary_group_name:
        id === 25 ? 'cs-support-sse' : id === 24 ? 'wow-mvp' : null,
    });
    const adapter = axios.create({
      adapter: (config) => {
        const url = new URL(config.url!);
        calls.push(url.pathname + url.search);
        let data: unknown;
        if (url.pathname.endsWith('/c/360.json'))
          data = {
            topic_list: {
              topics: [
                {
                  id: 42,
                  title: 'Cannot log in EU',
                  pinned: false,
                  last_posted_at: now.toISOString(),
                },
              ],
              more_topics_url:
                '/en/wow/c/wow-forever/wow-forever-general-discussion/360?page=1',
            },
          };
        else if (url.searchParams.has('page'))
          data = {
            topic_list: {
              topics: [
                {
                  id: 43,
                  title: 'Old topic',
                  pinned: false,
                  last_posted_at: '2026-11-08T00:00:00Z',
                },
              ],
            },
          };
        else if (url.pathname.endsWith('/t/42.json'))
          data = {
            title: 'Cannot log in EU',
            post_stream: {
              stream: Array.from({ length: 25 }, (_, i) => i + 1),
              posts: Array.from({ length: 20 }, (_, i) => makePost(i + 1)),
            },
          };
        else if (url.pathname.endsWith('/t/42/posts.json'))
          data = {
            post_stream: {
              posts: url.searchParams
                .getAll('post_ids[]')
                .map((id) => makePost(Number(id))),
            },
          };
        else return Promise.reject(new Error(`Unexpected URL ${url.pathname}`));
        return Promise.resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      },
    });
    const result = await new WowForumService(new HttpService(adapter)).read();
    expect(calls).toContain(
      '/en/wow/c/wow-forever/wow-forever-general-discussion/360.json?page=1',
    );
    expect(result.posts.map((p) => p.id)).toEqual(
      expect.arrayContaining([21, 22, 23, 24, 25]),
    );
    expect(result.posts.find((p) => p.id === 25)?.staff).toBe(true);
    expect(result.posts.find((p) => p.id === 24)?.staff).toBe(false);
    expect(result.posts.find((p) => p.id === 25)?.url).toBe(
      'https://eu.forums.blizzard.com/en/wow/t/42/25',
    );
  });

  it('rejects a partial topic instead of silently treating missing reports as silence', async () => {
    const now = new Date().toISOString();
    const adapter = axios.create({
      adapter: (config) =>
        Promise.resolve({
          data: config.url?.includes('/c/')
            ? {
                topic_list: {
                  topics: [
                    {
                      id: 42,
                      title: 'Cannot login EU',
                      pinned: false,
                      last_posted_at: now,
                    },
                  ],
                },
              }
            : { post_stream: { stream: [1, 2], posts: [] } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }),
    });
    await expect(
      new WowForumService(new HttpService(adapter)).read(),
    ).rejects.toThrow('niekompletne');
  });
});
